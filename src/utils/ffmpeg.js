const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function detectFfmpegPath() {
  // EL DEL SISTEMA PRIMERO, EL EMPAQUETADO AL FINAL.
  //
  // Iba al reves. El empaquetado (@ffmpeg-installer) es una compilacion de 2018,
  // y en cualquier maquina que tuviera los dos —un portatil, un servidor recien
  // montado antes de su primer despliegue— el bot abria con un ffmpeg de siete
  // años los ficheros que manda cualquiera del grupo, con todos los fallos de
  // seguridad que se le han encontrado desde entonces. El del sistema se
  // actualiza con la maquina y trae su ffprobe al lado.
  //
  // En la VPS no cambia nada: el despliegue ya borra el empaquetado cuando hay
  // uno de sistema (scripts/actualizar.sh). Y donde no hay ffmpeg propio —GitHub
  // Actions, un Termux sin `pkg install ffmpeg`— sigue estando el empaquetado.

  // 1. El del PATH (Termux incluido, si se instalo con pkg).
  try {
    const systemPath = execSync('which ffmpeg 2>/dev/null || command -v ffmpeg 2>/dev/null', { encoding: 'utf8' }).trim();
    if (systemPath && fs.existsSync(systemPath)) return systemPath;
  } catch {}

  // 2. Termux por ruta fija, por si el PATH no la trae.
  const termuxPath = '/data/data/com.termux/files/usr/bin/ffmpeg';
  if (fs.existsSync(termuxPath)) return termuxPath;

  // 3. El empaquetado, para las maquinas que no tienen otro.
  try {
    const bundled = require('@ffmpeg-installer/ffmpeg').path;
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch {}

  // Don't throw at module load — that would take down the WHOLE bot (including
  // non-media commands) just because ffmpeg is missing. Fall back to the bare
  // name and rely on PATH; if it's genuinely absent, the media command's own
  // ffmpeg call fails at runtime and is caught there with a user-facing error.
  return 'ffmpeg';
}

const ffmpegPath = detectFfmpegPath();

function detectFfprobePath() {
  // ffprobe lives next to ffmpeg in all standard installations
  const sibling = path.join(path.dirname(ffmpegPath), 'ffprobe');
  if (fs.existsSync(sibling)) return sibling;
  try {
    const which = execSync('which ffprobe 2>/dev/null || command -v ffprobe 2>/dev/null', { encoding: 'utf8' }).trim();
    if (which && fs.existsSync(which)) return which;
  } catch {}
  return 'ffprobe'; // rely on PATH
}

const ffprobePath = detectFfprobePath();

module.exports = { ffmpegPath, ffprobePath };
