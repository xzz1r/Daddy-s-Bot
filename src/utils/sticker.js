const { ffmpegPath, ffprobePath } = require('./ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const { tempFile, cleanTemp, ffmpegSemaphore } = require('./helpers');
const config = require('../config');
const logger = require('./logger');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

function detectExt(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'gif';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (buffer.slice(4, 8).toString() === 'ftyp') return 'mp4';
  return null;
}

// Detect animated WebP by searching for the ANIM chunk in the RIFF container.
// WhatsApp needs isAnimated:true in the proto to handle animated stickers correctly —
// without it, the client treats the WebP as static and breaks on save/forward.
function isAnimatedWebP(buf) {
  if (!buf || buf.length < 12) return false;
  if (buf.slice(0, 4).toString() !== 'RIFF') return false;
  if (buf.slice(8, 12).toString() !== 'WEBP') return false;
  let pos = 12;
  while (pos + 8 <= buf.length) {
    const type = buf.slice(pos, pos + 4).toString();
    if (type === 'ANIM') return true;
    const size = buf.readUInt32LE(pos + 4);
    pos += 8 + size + (size % 2);
  }
  return false;
}

// Extract the first ANMF frame from an animated WebP as a minimal static WebP.
// Used to generate a thumbnail without needing ffmpeg's animated WebP decoder.
function extractFirstAnmfFrame(animBuf) {
  if (!animBuf || animBuf.length < 12) return null;
  let pos = 12;
  while (pos + 8 <= animBuf.length) {
    const chunkType = animBuf.slice(pos, pos + 4).toString();
    const chunkSize = animBuf.readUInt32LE(pos + 4);
    if (chunkType === 'ANMF' && chunkSize > 16) {
      const frameChunk = animBuf.slice(pos + 24, pos + 8 + chunkSize);
      const riffSize = 4 + frameChunk.length;
      const out = Buffer.allocUnsafe(8 + riffSize);
      out.write('RIFF', 0, 'ascii');
      out.writeUInt32LE(riffSize, 4);
      out.write('WEBP', 8, 'ascii');
      frameChunk.copy(out, 12);
      return out;
    }
    pos += 8 + chunkSize + (chunkSize % 2);
  }
  return null;
}

// Thumbnail filter: scale to fit a 96px box keeping the source aspect ratio,
// then center it on a transparent 96x96 canvas. WhatsApp's sticker spec is a
// fixed square canvas — the padding is fully transparent so it's invisible
// (shows the chat background, not a visible bar), and the source is only ever
// scaled down to fit, never stretched or cropped.
const VF_THUMB = `scale=96:96:force_original_aspect_ratio=decrease,pad=96:96:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1,format=rgba`;

// Generate a small PNG thumbnail from any video/gif that ffmpeg can decode.
// Used for video and gif stickers: the bundled ffmpeg cannot decode its own
// animated WebP output, so generateAnimatedThumb always returned null for those
// cases. Without pngThumbnail WhatsApp composites its own static preview by
// stacking the first two animation frames — producing the "split in two" artifact.
// Calling this on the ORIGINAL source (mp4/gif) before WebP encoding works fine.
async function generateSourceThumb(srcBuffer) {
  const ext = detectExt(srcBuffer);
  if (!ext || ext === 'webp') return null;  // can't decode webp, skip
  const inputFile = tempFile(ext);
  const outputFile = tempFile('png');
  await fs.writeFile(inputFile, srcBuffer);
  try {
    await runFfmpeg(inputFile, outputFile, [
      '-map', '0:v:0',
      '-vframes', '1',
      '-vf', VF_THUMB,
      '-y',
    ], 'image2');
    const buf = await fs.readFile(outputFile);
    return buf.length > 100 ? buf : null;
  } catch {
    return null;
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

// Generate a small PNG thumbnail from an animated WebP.
// The bundled ffmpeg cannot decode WebP so we extract the first ANMF frame
// as a raw VP8 bitstream and re-wrap it as a minimal static WebP that ffmpeg
// can potentially decode, then fall back gracefully if that also fails.
// On environments without a WebP-capable ffmpeg this returns null, which is
// fine — generateSourceThumb (called from the original video/gif source) is
// the primary path and handles all normal cases.
async function generateAnimatedThumb(animBuf) {
  const frameBuf = extractFirstAnmfFrame(animBuf);
  if (frameBuf) {
    const inputFile = tempFile('webp');
    const outputFile = tempFile('png');
    await fs.writeFile(inputFile, frameBuf);
    try {
      await runFfmpeg(inputFile, outputFile, [
        '-vframes', '1',
        '-vf', VF_THUMB,
        '-y',
      ], 'image2');
      const buf = await fs.readFile(outputFile);
      if (buf.length > 100) return buf;
    } catch {} finally {
      await cleanTemp(inputFile);
      await cleanTemp(outputFile);
    }
  }
  // Guaranteed fallback: plain gray PNG so WhatsApp never stacks animation
  // frames to generate its own static preview (which produces the split visual).
  try {
    const { Jimp } = require('jimp');
    const img = new Jimp({ width: 96, height: 96, color: 0x808080ff });
    return await img.getBuffer('image/png');
  } catch {
    return null;
  }
}

// WhatsApp's sticker spec is a FIXED 512x512 canvas — that part is mandatory,
// not optional (a non-square canvas makes WhatsApp's own client mishandle the
// sticker, stretching or duplicating it to force it back into a square slot,
// which is worse than padding it ourselves). What we control is HOW the source
// fits inside that canvas: scaled down to fit (never upscaled, never cropped,
// never stretched) and centered with fully transparent padding — invisible in
// chat, since transparent reveals the wallpaper instead of drawing a bar. The
// shape of the actual visible content is exactly the source's shape; only the
// underlying file canvas is square because WhatsApp requires it to be.
// format=rgba preserves any genuine transparency the source already had.
const VF_STATIC = `scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1,format=rgba`;
const VF_ANIM = (fps, size = 512) =>
  `fps=${fps},scale=${size}:${size}:force_original_aspect_ratio=decrease,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1,format=rgba`;

// Hard kill if ffmpeg runs longer than this — on Termux a hung encode can
// otherwise pin a CPU core forever and zombie the command.
const FFMPEG_TIMEOUT_MS = 45_000;

// Acquires the shared ffmpeg slot before spawning, so e.g. 4 people sending
// !s at once on a 2-core phone run 2-at-a-time instead of all 4 simultaneously.
async function runFfmpeg(inputFile, outputFile, options, format = 'webp') {
  await ffmpegSemaphore.acquire();
  try {
    return await new Promise((resolve, reject) => {
      let stderrBuf = '';
      let timer = null;
      const cmd = ffmpeg(inputFile)
        .setFfmpegPath(ffmpegPath)
        .outputOptions(options)
        .toFormat(format)
        .on('stderr', (line) => { stderrBuf += line + '\n'; })
        .on('error', (err) => {
          if (timer) clearTimeout(timer);
          const lastLines = stderrBuf.trim().split('\n').slice(-4).join(' | ');
          reject(new Error(lastLines || err.message));
        })
        .on('end', () => {
          if (timer) clearTimeout(timer);
          resolve();
        });
      timer = setTimeout(() => {
        try { cmd.kill('SIGKILL'); } catch {}
        reject(new Error('ffmpeg timeout'));
      }, FFMPEG_TIMEOUT_MS);
      cmd.save(outputFile);
    });
  } finally {
    ffmpegSemaphore.release();
  }
}

// WhatsApp-specific EXIF: TIFF wrapper with custom tag 0x5741 ('WA' LE) type UNDEFINED (7).
// This is the EXACT 22-byte header that wa-sticker-formatter / node-webpmux emit —
// the format proven to produce saveable stickers across thousands of bots.
//
// Two things that MUST stay as-is (both were bugs that blocked "save to favorites"):
//  1. Value offset = 22 (0x16) with NO trailing "next-IFD offset" field. WhatsApp's
//     parser reads the JSON immediately after the single IFD entry; adding the
//     spec-compliant 4-byte next-IFD terminator (offset 26) breaks it.
//  2. ONLY these 4 JSON fields. The app-store-link / is-avatar-sticker fields make
//     WhatsApp treat the sticker as belonging to a downloadable third-party app pack,
//     which silently disables saving it to personal favorites.
function buildExif(pack, author) {
  const json = JSON.stringify({
    'sticker-pack-id': 'com.xz1s.daddysbot',
    'sticker-pack-name': pack,
    'sticker-pack-publisher': author,
    'emojis': [],
  });
  const data = Buffer.from(json, 'utf-8');

  const header = Buffer.from([
    0x49, 0x49, 0x2A, 0x00,             // TIFF magic (II, little-endian)
    0x08, 0x00, 0x00, 0x00,             // first IFD offset = 8
    0x01, 0x00,                         // 1 IFD entry
    0x41, 0x57,                         // tag 0x5741 ('WA' little-endian) — WhatsApp custom
    0x07, 0x00,                         // type 7 (UNDEFINED)
    0x00, 0x00, 0x00, 0x00,             // count = JSON byte length (filled below)
    0x16, 0x00, 0x00, 0x00,             // data offset = 22 (JSON starts right here)
  ]);
  header.writeUInt32LE(data.length, 14);

  return Buffer.concat([header, data]);
}

// Inject EXIF chunk directly into WebP binary (RIFF manipulation)
function injectExifIntoWebP(webp, exifBuf) {
  if (webp.slice(0, 4).toString() !== 'RIFF') throw new Error('Not RIFF');
  if (webp.slice(8, 12).toString() !== 'WEBP') throw new Error('Not WebP');

  const chunkType = webp.slice(12, 16).toString();

  // Pad EXIF to even length (RIFF requirement)
  const exifPadded = exifBuf.length % 2 === 0 ? exifBuf : Buffer.concat([exifBuf, Buffer.alloc(1)]);
  const exifChunk = Buffer.alloc(8 + exifPadded.length);
  exifChunk.write('EXIF', 0, 'ascii');
  exifChunk.writeUInt32LE(exifBuf.length, 4);
  exifPadded.copy(exifChunk, 8);

  if (chunkType === 'VP8X') {
    const out = Buffer.from(webp);

    // Every frame our encoder produces covers the FULL canvas (x=0, y=0,
    // w=h=canvas size) — ffmpeg's pad filter guarantees that. So blend mode
    // never needs to matter: this frame's pixels (including its own alpha)
    // are the entire picture, there's nothing of the previous frame left to
    // show through. We force blend=no (replace) on every single frame
    // regardless of whether it carries real alpha (VP8L/ALPH, from the
    // transparent pad border) or not (plain VP8). Without this, WhatsApp's
    // renderer alpha-blends a frame's semi-transparent edge pixels against
    // whatever the PREVIOUS frame drew there — different video content each
    // frame — producing a translucent ghost/"doubled" smear at the seam
    // between the opaque content and the transparent padding. libwebp also
    // always sets the VP8X Alpha flag (0x10) even for fully opaque animations
    // with no real alpha at all, so we track per-frame whether alpha is real
    // and only keep the flag set when at least one frame actually has it.
    const isAnim = !!(out[20] & 0x02); // Animation bit
    if (isAnim) {
      let hasAlpha = false;
      let p = 12;
      while (p + 8 <= out.length) {
        const ct = out.slice(p, p + 4).toString();
        const cs = out.readUInt32LE(p + 4);
        if (ct === 'ANMF' && cs > 16) {
          const inner = out.slice(p + 24, p + 28).toString();
          if (inner === 'VP8L' || inner === 'ALPH') hasAlpha = true;
          out[p + 23] |= 0x02; // bit 1 = blend=no (replace, don't blend) — always
        }
        p += 8 + cs + (cs % 2);
      }
      if (!hasAlpha) out[20] &= ~0x10; // clear incorrect Alpha flag
    }

    out[20] |= 0x08; // set EXIF flag

    // Rebuild the container dropping any pre-existing EXIF chunk before appending
    // the new one. Re-stamping a sticker that already carried pack metadata (e.g.
    // !s replying to someone else's sticker) would otherwise leave TWO EXIF chunks
    // in the file — a malformed WebP that WhatsApp silently refuses to save.
    const head = out.slice(0, 12);   // RIFF + size + WEBP
    const kept = [];
    let pos = 12;
    while (pos + 8 <= out.length) {
      const type = out.slice(pos, pos + 4).toString();
      const size = out.readUInt32LE(pos + 4);
      const total = 8 + size + (size % 2);
      if (type !== 'EXIF') kept.push(out.slice(pos, pos + total));
      pos += total;
    }

    const result = Buffer.concat([head, ...kept, exifChunk]);
    result.writeUInt32LE(result.length - 8, 4);
    return result;
  }

  // VP8 or VP8L: parse dimensions and wrap with VP8X
  let width = 512, height = 512;
  let alphaUsed = false;
  try {
    if (chunkType === 'VP8 ') {
      const scaledW = webp.readUInt16LE(26);
      const scaledH = webp.readUInt16LE(28);
      width = scaledW & 0x3FFF;
      height = scaledH & 0x3FFF;
      // Simple-format 'VP8 ' never carries alpha — leave alphaUsed false.
    } else if (chunkType === 'VP8L') {
      // skip 'VP8L'(4) + size(4) + signature(1) = 21 bytes from file start, then at offset 21
      const bits = webp.readUInt32LE(21);
      width = (bits & 0x3FFF) + 1;
      height = ((bits >> 14) & 0x3FFF) + 1;
      // VP8L's 32-bit header packs width(14) + height(14) + alpha_is_used(1) +
      // version(3) — bit 28 tells us whether this bitstream actually has alpha,
      // so the new VP8X wrapper can set the flag correctly instead of always
      // clearing it (which silently dropped real transparency on bare-VP8L
      // webp re-stamped without ever having had a VP8X header of its own).
      alphaUsed = !!((bits >> 28) & 0x1);
    }
  } catch {}

  // VP8X chunk: 'VP8X' + size(10) + flags(4) + canvas_width_minus_1(3) + canvas_height_minus_1(3)
  const vp8xChunk = Buffer.alloc(18);
  vp8xChunk.write('VP8X', 0, 'ascii');
  vp8xChunk.writeUInt32LE(10, 4);
  vp8xChunk.writeUInt32LE(alphaUsed ? 0x18 : 0x08, 8); // EXIF flag (+ Alpha flag if real)
  vp8xChunk.writeUIntLE(width - 1, 12, 3);
  vp8xChunk.writeUIntLE(height - 1, 15, 3);

  const originalChunks = webp.slice(12);     // VP8/VP8L chunk onwards
  const body = Buffer.concat([vp8xChunk, originalChunks, exifChunk]);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(body.length + 4, 4);
  header.write('WEBP', 8, 'ascii');
  return Buffer.concat([header, body]);
}

function addStickerMeta(webpBuffer, author) {
  const exif = buildExif(config.sticker.pack, author || config.sticker.author);
  // Pure buffer ops — no parsing overhead, no double-load. If it ever throws on
  // a malformed WebP, ship the sticker without pack metadata instead of dragging
  // in a heavy parser as a fallback (node-webpmux used to be that fallback).
  try {
    return injectExifIntoWebP(webpBuffer, exif);
  } catch (err) {
    logger.warn(`addStickerMeta: binary inject failed, sending without pack: ${err.message}`);
    return webpBuffer;
  }
}

// WhatsApp's documented ceiling for static stickers is ~100KB. Quality is
// dropped step by step only if the previous attempt overshot it — the first
// pass (q=90) is "maximum possible quality" and is kept whenever it fits.
const STATIC_TARGET_BYTES = 100 * 1024;
const STATIC_QUALITY_TIERS = [90, 80, 65, 50, 35];

function encodeStaticWebp(inputFile, outputFile, quality) {
  return runFfmpeg(inputFile, outputFile, [
    '-vf', VF_STATIC,
    '-c:v', 'libwebp',
    '-frames:v', '1',
    '-q:v', String(quality),
    '-compression_level', '6', // single frame: worth spending more CPU for a smaller file
    '-an',
    '-y',
  ]);
}

async function imageToSticker(imageBuffer, author) {
  const ext = detectExt(imageBuffer);
  if (!ext) throw new Error('Formato de imagen no reconocido');

  // WebP: inject metadata directly — no ffmpeg needed
  if (ext === 'webp') return addStickerMeta(imageBuffer, author);

  const inputFile = tempFile(ext);
  const outputFile = tempFile('webp');
  await fs.writeFile(inputFile, imageBuffer);

  try {
    let out = null;
    let smallest = null;
    for (const quality of STATIC_QUALITY_TIERS) {
      try {
        await encodeStaticWebp(inputFile, outputFile, quality);
      } catch { continue; }
      const buf = await fs.readFile(outputFile);
      if (buf.length < 100) continue;
      if (!smallest || buf.length < smallest.length) smallest = buf;
      if (buf.length <= STATIC_TARGET_BYTES) { out = buf; break; }
    }
    const result = out || smallest;
    if (!result) throw new Error('Sticker generado vacío');
    return addStickerMeta(result, author);
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

// WhatsApp's real-world animated sticker limit is ~1MB (its documented 500KB
// guideline is conservative — clients accept up to roughly double that in practice).
const MAX_STICKER_BYTES = 1024 * 1024;

// FPS is locked to 24-30 always — never drops lower, per product requirement.
// Quality and, as a last resort, canvas size are the only levers used to control
// file weight. Tiers are tried in order until one fits under MAX_STICKER_BYTES.
const ANIM_TIERS = [
  { fps: 30, quality: 85, size: 512 },
  { fps: 30, quality: 75, size: 512 },
  { fps: 24, quality: 80, size: 512 },
  { fps: 24, quality: 70, size: 512 },
  { fps: 24, quality: 60, size: 512 },
  { fps: 24, quality: 50, size: 512 },
  { fps: 24, quality: 60, size: 384 },
  { fps: 24, quality: 45, size: 384 },
  { fps: 24, quality: 35, size: 384 },
];

// Empirically measured libwebp output-size multipliers per quality/canvas-size,
// relative to q85 @ 512px (benchmarked across multiple unrelated source clips —
// the ratios held within ~1% of each other regardless of content, since they
// mostly track encoder bit-allocation curves rather than scene complexity).
// Lets videoToSticker predict a tier's output size from one real encode of a
// different tier, instead of having to run ffmpeg again just to find out it
// still overshoots — each skipped tier saves a multi-second re-encode.
const QUALITY_SIZE_FACTOR = { 85: 1.0, 80: 0.853, 75: 0.737, 70: 0.704, 60: 0.649, 50: 0.591, 45: 0.558, 35: 0.482 };
const CANVAS_SIZE_FACTOR = { 512: 1.0, 384: 0.70 };

function predictTierBytes(tier, refTier, refBytes) {
  return refBytes
    * (tier.fps / refTier.fps)
    * (QUALITY_SIZE_FACTOR[tier.quality] / QUALITY_SIZE_FACTOR[refTier.quality])
    * (CANVAS_SIZE_FACTOR[tier.size] / CANVAS_SIZE_FACTOR[refTier.size]);
}

// Probe video duration with ffprobe so we can skip tiers that will obviously
// overshoot 1MB. Returns 0 on error (treated as "unknown / short").
function getVideoDurationS(inputFile) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(0), 5000);
    ffmpeg.ffprobe(inputFile, (err, meta) => {
      clearTimeout(t);
      if (err || !meta) return resolve(0);
      const vs = meta.streams?.find(s => s.codec_type === 'video');
      const dur = parseFloat(vs?.duration ?? meta.format?.duration ?? '0');
      resolve(isFinite(dur) && dur > 0 ? dur : 0);
    });
  });
}

// Pick the first tier index likely to produce a file ≤ 1MB without re-encoding.
// Rough estimate, real content varies widely, so stay conservative (prefer one
// re-encode over sending a blurry sticker).
function startTierIndex(durationS) {
  if (!durationS || durationS < 3) return 0;  // short / unknown: max quality
  if (durationS < 5) return 2;                 // ~3-5 s
  if (durationS < 8) return 3;                 // ~5-8 s
  return 4;                                     // long: skip the top tiers
}

// Use the plain `libwebp` encoder, NOT `libwebp_anim`. libwebp_anim applies
// inter-frame compression: it emits partial ANMF frames (only the changed
// region, positioned at a Y offset, with blend=yes / dispose=none). Spec-
// compliant decoders reconstruct these fine, but WhatsApp's decoder does not —
// it renders the partial regions stacked, producing the duplicated, pixelated
// "split in two" sticker. Plain `libwebp` emits every frame as a FULL keyframe
// (full canvas, no blending), which WhatsApp renders faithfully. Output is a bit
// larger, which the size-tiering loop in videoToSticker already handles.
async function encodeAnimWebp(inputFile, outputFile, fps, quality, size = 512) {
  await ffmpegSemaphore.acquire();
  try {
    return await new Promise((resolve, reject) => {
      let stderrBuf = '';
      let timer = null;
      const cmd = ffmpeg(inputFile)
        .setFfmpegPath(ffmpegPath)
        .outputOptions([
          '-map', '0:v:0',
          '-vf', VF_ANIM(fps, size),
          '-c:v', 'libwebp',
          '-loop', '0',
          '-an',
          '-q:v', String(quality),
          '-compression_level', '2',
          '-preset', 'default',
          '-y',
        ])
        .toFormat('webp')
        .on('stderr', (line) => { stderrBuf += line + '\n'; })
        .on('error', () => {
          if (timer) clearTimeout(timer);
          const lastLines = stderrBuf.trim().split('\n').slice(-4).join(' | ');
          reject(new Error(lastLines || 'ffmpeg error'));
        })
        .on('end', () => {
          if (timer) clearTimeout(timer);
          resolve();
        })
        .save(outputFile);
      timer = setTimeout(() => {
        try { cmd.kill('SIGKILL'); } catch {}
        reject(new Error('ffmpeg timeout'));
      }, FFMPEG_TIMEOUT_MS);
    });
  } finally {
    ffmpegSemaphore.release();
  }
}

async function videoToSticker(videoBuffer, author) {
  const detected = detectExt(videoBuffer);

  if (detected === 'webp') return addStickerMeta(videoBuffer, author);

  const ext = detected || 'mp4';
  const inputFile = tempFile(ext);
  const outputFile = tempFile('webp');
  await fs.writeFile(inputFile, videoBuffer);

  try {
    const durationS = await getVideoDurationS(inputFile);
    const startIdx = startTierIndex(durationS);

    let buf = null;
    let smallest = null;   // keep the lightest valid encode as a fallback
    let refBytes = null, refTier = null; // last real encode, feeds predictTierBytes
    for (let i = startIdx; i < ANIM_TIERS.length; i++) {
      const tier = ANIM_TIERS[i];
      // Skip a tier predicted to still overshoot — never skip the last tier, so
      // there's always a final real encode to fall back to. 8% headroom on the
      // cap absorbs the small variance the benchmark showed across content types.
      if (refBytes !== null && i < ANIM_TIERS.length - 1) {
        if (predictTierBytes(tier, refTier, refBytes) > MAX_STICKER_BYTES * 1.08) continue;
      }
      const { fps, quality, size } = tier;
      try {
        await encodeAnimWebp(inputFile, outputFile, fps, quality, size);
      } catch { continue; }  // tier failed, try next
      buf = await fs.readFile(outputFile);
      if (buf.length < 100) continue;
      refBytes = buf.length; refTier = tier;
      if (buf.length <= MAX_STICKER_BYTES) { smallest = buf; break; }
      if (!smallest || buf.length < smallest.length) smallest = buf;
    }
    // If no tier fit the cap, ship the smallest we produced (most likely to be
    // accepted/saveable) rather than whatever the last tier happened to output.
    const out = (buf && buf.length >= 100 && buf.length <= MAX_STICKER_BYTES) ? buf : smallest;
    if (!out || out.length < 100) throw new Error('Sticker animado vacío');
    return addStickerMeta(out, author);
  } finally {
    await cleanTemp(inputFile);
    await cleanTemp(outputFile);
  }
}

// Raw GIF (image/gif attachment) → animated sticker. detectExt sees 'gif',
// so videoToSticker writes a .gif temp file and ffmpeg reads it once through
// with the same square-fit tiers — no separate code path needed.
async function gifToSticker(gifBuffer, author) {
  return videoToSticker(gifBuffer, author);
}

module.exports = { imageToSticker, videoToSticker, gifToSticker, generateAnimatedThumb, generateSourceThumb, isAnimatedWebP, extractFirstAnmfFrame, MAX_STICKER_BYTES, VF_STATIC };
