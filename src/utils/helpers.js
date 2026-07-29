const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const TEMP_DIR = path.join(__dirname, '../../temp');

async function ensureTemp() {
  await fs.ensureDir(TEMP_DIR);
  // Sweep stale temp files (>1h old) from previous runs so the dir doesn't
  // accumulate failed downloads, half-encoded stickers, etc.
  const ONE_HOUR = 60 * 60 * 1000;
  try {
    const entries = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    await Promise.all(entries.map(async (name) => {
      const full = path.join(TEMP_DIR, name);
      try {
        const stat = await fs.stat(full);
        if (now - stat.mtimeMs > ONE_HOUR) await fs.remove(full);
      } catch {}
    }));
  } catch {}
  return TEMP_DIR;
}

function tempFile(ext) {
  const name = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  return path.join(TEMP_DIR, name);
}

async function cleanTemp(filePath) {
  try {
    if (filePath && await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
  } catch {}
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Anti-repetition picker. Avoids returning any element of `pool` that was
// already returned for the same `key` within the recent window, so the same
// phrase doesn't land twice in a short span. State is in-memory (per process)
// and keyed by an arbitrary string the caller owns — typically
// `${groupJid}|${command}` so every command/group keeps its own history.
//
// The window is capped at pool.length - 1 so a small pool can never block
// everything; if the whole pool is somehow exhausted it falls back to a plain
// random pick instead of returning nothing.
const _pickHistory = new Map(); // key -> array of recently returned elements
const _MAX_PICK_KEYS = 2000;    // bound the map so long-lived bots don't leak

function pickFresh(pool, key, window = 12) {
  if (!Array.isArray(pool) || pool.length === 0) return undefined;
  if (!key) return pick(pool);

  // Evict the oldest key once we hit the cap (Map preserves insertion order).
  if (!_pickHistory.has(key) && _pickHistory.size >= _MAX_PICK_KEYS) {
    _pickHistory.delete(_pickHistory.keys().next().value);
  }

  const hist = _pickHistory.get(key) || [];
  const block = new Set(hist.slice(-Math.min(window, pool.length - 1)));
  const avail = pool.filter(p => !block.has(p));
  const chosen = pick(avail.length ? avail : pool);

  hist.push(chosen);
  if (hist.length > window + 4) hist.shift();
  _pickHistory.set(key, hist);
  return chosen;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Default cap for buffering attacker-controlled WhatsApp media (stickers,
// !toimg, !tagall forwards) fully into RAM before processing. Legitimate
// images/videos/stickers sent through normal chat are always well under
// this; only an oversized document attachment would ever hit it — and on a
// Termux/phone host, buffering an unbounded download is the more dangerous
// failure mode (OOM-kills the whole bot) than rejecting one odd request.
const MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024;

// Tighter cap for media that gets fully buffered AND handed to ffmpeg (sticker
// sources, !toimg, !fk images). A sticker/photo source is always well under
// this; capping here instead of the 64MB default halves the worst-case RAM when
// two encodes run at once — the difference between fine and OOM on a 1GB box.
const MAX_MEDIA_BYTES = 24 * 1024 * 1024;

async function streamToBuffer(stream, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.length;
    if (maxBytes && total > maxBytes) {
      throw new Error(`Archivo demasiado grande (>${Math.round(maxBytes / 1024 / 1024)}MB)`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Lightweight counting semaphore. Used to cap how many ffmpeg/yt-dlp child
// processes run at once — a phone CPU that's fine with 2 concurrent encodes
// falls over with 6. Extra acquire() calls queue and resolve as slots free,
// same shape as the download queue in utils/downloader.js.
function createSemaphore(limit) {
  let active = 0;
  const queue = [];
  function acquire() {
    return new Promise((resolve) => {
      const tryRun = () => {
        if (active < limit) { active++; resolve(); }
        else queue.push(tryRun);
      };
      tryRun();
    });
  }
  function release() {
    active--;
    const next = queue.shift();
    if (next) next();
  }
  return { acquire, release };
}

// Shared across every command that spawns ffmpeg (stickers, !toimg, !ttp) so
// the cap is process-wide, not per-file. Limit of 2 mirrors the existing,
// already-proven MAX_CONCURRENT_DOWNLOADS in utils/downloader.js.
const ffmpegSemaphore = createSemaphore(2);

// Run ffmpeg reading `input` (a Buffer, or null) from stdin and resolving its
// stdout as a Buffer. Two things every ad-hoc ffmpeg spawn MUST have but the
// pfp/hash paths were missing: a hard timeout that SIGKILLs a hung/malicious
// input (a crafted profile photo could otherwise make ffmpeg spin forever and
// wedge the auto-indexer), and the shared ffmpegSemaphore so hashing/downscaling
// can't push the process-wide ffmpeg count past 2 on a 1GB box. lazy-require of
// ffmpegPath avoids paying the binary-detection cost for non-media callers.
async function ffmpegToBuffer(args, input = null, timeoutMs = 10000) {
  const { ffmpegPath } = require('./ffmpeg');
  await ffmpegSemaphore.acquire();
  try {
    return await new Promise((resolve, reject) => {
      const ff = spawn(ffmpegPath, args);
      const chunks = [];
      let settled = false;
      const done = (fn, val) => { if (settled) return; settled = true; clearTimeout(timer); fn(val); };
      const timer = setTimeout(() => {
        try { ff.kill('SIGKILL'); } catch {}
        done(reject, new Error('ffmpeg timeout'));
      }, timeoutMs);
      ff.stdout.on('data', d => chunks.push(d));
      ff.on('error', e => done(reject, e));
      ff.on('close', code => {
        const out = Buffer.concat(chunks);
        if (code === 0 && out.length) done(resolve, out);
        else done(reject, new Error(`ffmpeg salió con código ${code}`));
      });
      ff.stdin.on('error', () => {}); // EPIPE si ffmpeg cierra antes de tiempo
      ff.stdin.end(input || undefined);
    });
  } finally {
    ffmpegSemaphore.release();
  }
}

// Atomic JSON write: serialize to a unique temp sibling, then rename over the
// target. rename(2) is atomic on the same filesystem, so a crash, OOM-kill or
// battery cut mid-write leaves the PREVIOUS file intact instead of a truncated
// one. Without this, a corrupt half-write makes the next readJson throw, and
// the stores' `catch → {}` then silently wipes all persisted data on boot.
// Safe store read. Returns `fallback` ONLY when the file genuinely doesn't
// exist yet (first run). Any OTHER error — a transient EMFILE/ENOMEM/EACCES
// under memory pressure on a 1GB box, or a corrupt file — is rethrown, so the
// caller's load rejects and the in-memory store stays null instead of being
// reset to empty and then overwriting the good on-disk file. This closes the
// "one transient read error = permanent silent data wipe" hole.
async function readJsonOrEnoent(file, fallback) {
  try {
    return await fs.readJson(file);
  } catch (e) {
    if (e && e.code === 'ENOENT') return fallback;
    throw e;
  }
}

async function atomicWriteJson(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    // Compact JSON: these are machine-only files written every few seconds on
    // the debounced path — pretty-printing just doubles size and CPU/disk.
    await fs.outputFile(tmp, JSON.stringify(data));
    // rename, NO fs.move. fs.move con overwrite hace remove(dest) ANTES del
    // rename (fs-extra/lib/move/move.js:28-35), así que deja una ventana en la
    // que el fichero de datos NO existe: un corte justo ahí se lleva el store
    // entero, que es exactamente lo que esta función promete evitar.
    //
    // rename(2) sobre un destino existente es atómico y nunca deja el hueco. El
    // temporal se crea en el mismo directorio que el destino a propósito, así
    // que están en el mismo sistema de ficheros y no hay EXDEV que valga.
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.remove(tmp).catch(() => {});
    throw err;
  }
}

// Formato de numero con separador de miles en espanyol. Estaba duplicado
// literalmente en 8 modulos.
const fmt = n => n.toLocaleString('es-ES');

module.exports = {
  fmt, ensureTemp, tempFile, cleanTemp, formatUptime, pick, pickFresh, shuffle, streamToBuffer, atomicWriteJson, readJsonOrEnoent, MAX_DOWNLOAD_BYTES, MAX_MEDIA_BYTES, createSemaphore, ffmpegSemaphore, ffmpegToBuffer };
