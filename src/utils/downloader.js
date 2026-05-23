const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { tempFile, cleanTemp } = require('./helpers');
const logger = require('./logger');

// Detect yt-dlp binary path
function detectYtDlp() {
  const candidates = [
    '/data/data/com.termux/files/home/.local/bin/yt-dlp',
    '/data/data/com.termux/files/usr/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const which = execSync('command -v yt-dlp 2>/dev/null || which yt-dlp 2>/dev/null', { encoding: 'utf8' }).trim();
    if (which) return which;
  } catch {}
  return 'yt-dlp';
}

const YT_DLP = detectYtDlp();
logger.info(`yt-dlp detectado en: ${YT_DLP}`);

function ytdlp(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP, args, { ...opts });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => reject(new Error(`yt-dlp no se pudo ejecutar: ${err.message}. Instalá con: pip install yt-dlp`)));
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `yt-dlp salió con código ${code}`));
    });
  });
}

function formatSeconds(s) {
  if (!s) return '?';
  const total = parseInt(s, 10);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

async function searchYouTube(query) {
  try {
    const output = await ytdlp([
      `ytsearch5:${query}`,
      '--dump-json',
      '--no-download',
      '--no-warnings',
      '--no-playlist',
      '--default-search', 'ytsearch',
      '--skip-download',
    ]);

    const lines = output.trim().split('\n').filter(l => l.trim().startsWith('{'));
    const videos = lines.map(line => {
      try {
        const v = JSON.parse(line);
        return {
          id: v.id,
          title: v.title || 'Sin título',
          duration: formatSeconds(v.duration),
          channel: v.uploader || v.channel || 'Desconocido',
          views: v.view_count,
          url: v.webpage_url || `https://www.youtube.com/watch?v=${v.id}`,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (!videos.length) throw new Error('Sin resultados');
    return videos;
  } catch (err) {
    logger.error(`YouTube search error: ${err.message}`);
    throw new Error(`Error al buscar: ${err.message}`);
  }
}

async function downloadAudio(videoUrl) {
  const baseName = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempDir = path.dirname(tempFile('tmp'));
  const outTemplate = path.join(tempDir, `${baseName}.%(ext)s`);
  const expectedFile = path.join(tempDir, `${baseName}.mp3`);

  try {
    // First, get metadata
    const infoJson = await ytdlp([
      videoUrl,
      '--dump-json',
      '--no-download',
      '--no-warnings',
      '--no-playlist',
    ]);

    const info = JSON.parse(infoJson.trim().split('\n').find(l => l.startsWith('{')));
    const duration = info.duration || 0;

    if (duration > 600) {
      throw new Error(`El video es muy largo (${formatSeconds(duration)}, máx 10 min)`);
    }

    // Download audio as mp3
    await ytdlp([
      videoUrl,
      '-x',                              // extract audio
      '--audio-format', 'mp3',
      '--audio-quality', '0',            // best quality
      '-o', outTemplate,
      '--no-playlist',
      '--no-warnings',
      '--no-part',
      '--max-filesize', '60M',
      '--no-mtime',
    ]);

    // Verify file exists and is non-empty
    if (!await fs.pathExists(expectedFile)) {
      // Sometimes yt-dlp keeps a different ext, search the dir
      const files = await fs.readdir(tempDir);
      const found = files.find(f => f.startsWith(baseName));
      if (!found) throw new Error('yt-dlp no produjo archivo');
      const altPath = path.join(tempDir, found);
      await fs.move(altPath, expectedFile);
    }

    const stat = await fs.stat(expectedFile);
    if (stat.size < 1024) {
      throw new Error('Archivo descargado vacío o corrupto');
    }

    return {
      filePath: expectedFile,
      title: info.title || 'Sin título',
      author: info.uploader || info.channel || 'Desconocido',
      duration,
    };
  } catch (err) {
    await cleanTemp(expectedFile);
    throw err;
  }
}

module.exports = { searchYouTube, downloadAudio };
