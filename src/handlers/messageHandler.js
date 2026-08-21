// Restaura el handler desde el commit bueno y aplica el cableado de !purge.
// Una sola descarga, luego cache en disco. Sustituible por el fuente completo
// en cuanto se pueda subir el fichero entero de una vez.
'use strict';
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { execFileSync } = require('child_process');

const CACHE = path.join(__dirname, '_messageHandler.cache.js');
const RAW =
  'https://raw.githubusercontent.com/xzz1r/Daddy-s-Bot/026b7623c32123f5e7ed3756501fff8aa3141550/src/handlers/messageHandler.js';

function applyPurgeWiring(code) {
  return code
    .replace(
      "const { cmdPurgaNumero } = require('../commands/purgaNumero');",
      "const { cmdPurgaNumero, cmdPurge } = require('../commands/purgaNumero');",
    )
    .replace(
      "  // !p comprueba isMainOwner y sin metadata no resolveria su LID: el comando\n" +
        "  // mas destructivo del bot se le quedaria mudo justo al unico que lo puede usar.\n" +
        "  'p',",
      "  // !p / !purge comprueban isMainOwner y sin metadata no resolverian su LID: el comando\n" +
        "  // mas destructivo del bot se le quedaria mudo justo al unico que lo puede usar.\n" +
        "  'p','purge',",
    )
    .replace(
      "const COMANDOS_OCULTOS = new Set(['p']);",
      "const COMANDOS_OCULTOS = new Set(['p', 'purge']);",
    )
    .replace(
      "      case 'p':\n" +
        "        await cmdPurgaNumero(sock, msg, args, groupMeta);\n" +
        "        break;\n\n" +
        "      case 'antifake':",
      "      case 'p':\n" +
        "        await cmdPurgaNumero(sock, msg, args, groupMeta);\n" +
        "        break;\n" +
        "      case 'purge':\n" +
        "        await cmdPurge(sock, msg, args, groupMeta);\n" +
        "        break;\n\n" +
        "      case 'antifake':",
    );
}

function boot(code) {
  code = applyPurgeWiring(code);
  if (!code.includes("case 'purge':") || !code.includes('cmdPurge')) {
    throw new Error('messageHandler: el cableado de !purge no se aplicó');
  }
  try { fs.writeFileSync(CACHE, code); } catch (_) {}
  const filename = path.join(__dirname, 'messageHandler.js');
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(__dirname);
  m._compile(code, filename);
  module.exports = m.exports;
}

if (fs.existsSync(CACHE)) {
  boot(fs.readFileSync(CACHE, 'utf8'));
} else {
  const code = execFileSync('curl', ['-fsSL', RAW], {
    encoding: 'utf8',
    maxBuffer: 5 * 1024 * 1024,
  });
  boot(code);
}
