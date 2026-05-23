const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { tempFile, cleanTemp } = require('./helpers');
const logger = require('./logger');

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

function ytdlp(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP, args);
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => reject(new Error(`yt-dlp no se pudo ejecutar: ${err.message}`)));
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else {
        // Extract a clean error message from stderr
        const cleanErr = stderr.split('\n').filter(l => l.startsWith('ERROR:')).pop() || stderr.trim().split('\n').pop() || `código ${code}`;
        reject(new Error(cleanErr.replace(/^ERROR:\s*/, '')));
      }
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

// Bypass YouTube's signature extraction by using alternative player clients
const PLAYER_CLIENTS = ['tv_embedded', 'android', 'web_safari', 'web'].join(',');

async function searchYouTube(query) {
  try {
    const output = await ytdlp([
      `ytsearch5:${query}`,
      '--dump-json',
      '--no-download',
      '--no-warnings',
      '--no-playlist',
      '--skip-download',
      '--extractor-args', `youtube:player_client=${PLAYER_CLIENTS}`,
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
          url: v.webpage_url || `https://www.youtube.com/watch?v=${v.id}`,
        };
      } catch { return null; }
    }).filter(Boolean);

    if (!videos.length) throw new Error('Sin resultados');
    return videos;
  } catch (err) {
    logger.error(`YouTube search error: ${err.message}`);
    throw new Error(err.message);
  }
}

async function downloadAudio(videoUrl) {
  const baseName = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempDir = path.dirname(tempFile('tmp'));
  const outTemplate = path.join(tempDir, `${baseName}.%(ext)s`);

  // Single yt-dlp call: print title and download simultaneously
  let output;
  try {
    output = await ytdlp([
      videoUrl,
      '--print', '%(title)s',
      '--no-simulate',
      '-f', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best',
      '-o', outTemplate,
      '--no-playlist',
      '--no-warnings',
      '--no-part',
      '--max-filesize', '60M',
      '--no-mtime',
      '--match-filter', 'duration<=600',
      '--extractor-args', `youtube:player_client=${PLAYER_CLIENTS}`,
    ]);
  } catch (err) {
    if (err.message.includes('does not pass filter') || err.message.includes('match-filter')) {
      throw new Error('Video muy largo (máx 10 min)');
    }
    throw new Error(err.message);
  }

  const title = output.trim().split('\n')[0] || 'Sin título';

  const files = await fs.readdir(tempDir);
  const audioFile = files.find(f => f.startsWith(baseName));
  if (!audioFile) throw new Error('yt-dlp no produjo archivo');
  const fullPath = path.join(tempDir, audioFile);

  const stat = await fs.stat(fullPath);
  if (stat.size < 1024) {
    await cleanTemp(fullPath);
    throw new Error('Archivo descargado vacío');
  }

  const ext = path.extname(audioFile).slice(1).toLowerCase();
  const mimetypes = {
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    mp3: 'audio/mpeg',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    opus: 'audio/ogg; codecs=opus',
    aac: 'audio/aac',
  };
  const mimetype = mimetypes[ext] || 'audio/mp4';

  return { filePath: fullPath, title, mimetype, ext };
}

module.exports = { searchYouTube, downloadAudio };
