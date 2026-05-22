const fs = require('fs');
const { execSync } = require('child_process');

function detectFfmpegPath() {
  // 1. Try bundled binary (@ffmpeg-installer/ffmpeg)
  try {
    const bundled = require('@ffmpeg-installer/ffmpeg').path;
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch {}

  // 2. Try system ffmpeg in PATH (Termux: pkg install ffmpeg)
  try {
    const systemPath = execSync('which ffmpeg 2>/dev/null || command -v ffmpeg 2>/dev/null', { encoding: 'utf8' }).trim();
    if (systemPath && fs.existsSync(systemPath)) return systemPath;
  } catch {}

  // 3. Termux hardcoded path as last resort
  const termuxPath = '/data/data/com.termux/files/usr/bin/ffmpeg';
  if (fs.existsSync(termuxPath)) return termuxPath;

  throw new Error('ffmpeg no encontrado. En Termux ejecuta: pkg install ffmpeg');
}

const ffmpegPath = detectFfmpegPath();

module.exports = { ffmpegPath };
