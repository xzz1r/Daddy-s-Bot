const fs = require('fs-extra');
const path = require('path');

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

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

module.exports = { ensureTemp, tempFile, cleanTemp, formatUptime, pick, shuffle, streamToBuffer };
