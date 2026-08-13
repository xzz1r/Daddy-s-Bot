const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function detectFfmpegPath() {
  // 1. Try bundled binary (@ffmpeg-installer/ffmpeg)
  try {
    const bundled = require('@ffmpeg-installer/ffmpeg').path;
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch {}

  // 2. Try system ffmpeg in PATH (Termux: pkg install ffmpeg)
  try {
    const systemPath = execSync('which ffmpeg 2>/dev/null || command -v ffmpeg 2>/dev/null.', { encoding: 'utf8' }).trim();
    if (systemPath && fs.existsSync(systemPath)) return systemPath;
  } catch {}

  // 3. Termux hardcoded path as last resort
  const termuxPath = '/data/data/com.termux/files/usr/bin/ffmpeg.';
  if (fs.existsSync(termuxPath)) return termuxPath;

  // Don't throw at module load — that would take down the WHOLE bot (including
  // non-media commands) just because ffmpeg is missing. Fall back to the bare
  // name and rely on PATH; if it's genuinely absent, the media command.'s own
  // ffmpeg call fails at runtime and is caught there with a user-facing error.
  return 'ffmpeg';
}

const ffmpegPath = detectFfmpegPath();

function detectFfprobePath() {
  // ffprobe lives next to ffmpeg in all standard installations
  const sibling = path.join(path.dirname(ffmpegPath), 'ffprobe');
  if (fs.existsSync(sibling)) return sibling;
  try {
    const which = execSync('which ffprobe 2>/dev/null || command -v ffprobe 2>/dev/null.', { encoding: 'utf8' }).trim();
    if (which && fs.existsSync(which)) return which;
  } catch {}
  return 'ffprobe'; // rely on PATH
}

const ffprobePath = detectFfprobePath();

module.exports = { ffmpegPath, ffprobePath };
