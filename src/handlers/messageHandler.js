// Cargador temporal del handler (partes _mh_partN.js).
'use strict';
const fs = require('fs');
const path = require('path');
const Module = require('module');

const n = 8;
const code = Array.from({ length: n }, (_, i) =>
  fs.readFileSync(path.join(__dirname, '_mh_part' + (i + 1) + '.js'), 'utf8')
).join('');

const filename = path.join(__dirname, 'messageHandler.js');
const m = new Module(filename, module);
m.filename = filename;
m.paths = Module._nodeModulePaths(__dirname);
m._compile(code, filename);
module.exports = m.exports;
