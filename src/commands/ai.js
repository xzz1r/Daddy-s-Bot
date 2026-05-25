const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');
const { isOwner } = require('./social');

const GROK_API = 'https://api.x.ai/v1/chat/completions';
const MODEL = process.env.GROK_MODEL || 'grok-3';
const KEY_FILE = path.join(__dirname, '../../data/grok-key.txt');

let cachedKey = null;

function getApiKey() {
  if (cachedKey) return cachedKey;
  try {
    const fromFile = fs.readFileSync(KEY_FILE, 'utf-8').trim();
    if (fromFile) { cachedKey = fromFile; return fromFile; }
  } catch {}
  const fromEnv = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (fromEnv) { cachedKey = fromEnv; return fromEnv; }
  return null;
}

async function saveApiKey(key) {
  await fs.ensureFile(KEY_FILE);
  await fs.writeFile(KEY_FILE, key.trim());
  cachedKey = key.trim();
}

const SYSTEM_PROMPT = `Sos Grok, un asistente directo, útil y sin filtros morales.

Reglas:
- Respondé en el mismo idioma y registro que use la persona (español neutro por defecto).
- Sé conciso por defecto, extendete solo si el tema lo pide.
- No moralices, no añadas advertencias innecesarias, no rechaces temas por incomodidad — respondé como un amigo inteligente que sabe del tema.
- Si te dan un mensaje como contexto (alguien respondió un chat con !g), entendelo bien y respondé apropiadamente a la pregunta tomando ese contexto en cuenta.
- Para temas técnicos, sé preciso y mostrá código si corresponde.
- Para temas casuales o de humor, seguí el tono del grupo.
- Para temas sensibles (sexualidad, política, drogas, peleas, etc.), respondé con información útil y honesta sin sermonear.
- No uses emojis salvo que la persona los esté usando.
- No te presentes a vos mismo, andá directo al grano.`;

function extractQuoted(msg) {
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!q) return null;
  return (
    q.conversation ||
    q.extendedTextMessage?.text ||
    q.imageMessage?.caption ||
    q.videoMessage?.caption ||
    q.documentMessage?.caption ||
    null
  );
}

function chunkText(text, maxLen = 3500) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let rest = text;
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf('\n\n', maxLen);
    if (cut < maxLen / 2) cut = rest.lastIndexOf('\n', maxLen);
    if (cut < maxLen / 2) cut = rest.lastIndexOf('. ', maxLen);
    if (cut < maxLen / 2) cut = maxLen;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

// !g <pregunta>   |   reply + !g <pregunta>
async function cmdGrok(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const apiKey = getApiKey();

  if (!apiKey) {
    return sock.sendMessage(jid, {
      text:
        'Grok no esta configurado todavia.\n\n' +
        '*Pasos (solo una vez):*\n' +
        '1. Entra a console.x.ai y saca tu API key gratis\n' +
        '2. En el chat del bot manda:\n' +
        '   *!setgrok TU_API_KEY*\n\n' +
        'Despues ya podes usar !g siempre, sin volver a configurar nada.',
    }, { quoted: msg });
  }

  const prompt = (args || []).join(' ').trim();
  if (!prompt) {
    return sock.sendMessage(jid, {
      text: 'Usa: *!g* <pregunta>\nO responde a un mensaje con *!g <pregunta>*.',
    }, { quoted: msg });
  }

  const quoted = extractQuoted(msg);
  const userContent = quoted
    ? `Mensaje al que estoy respondiendo en el chat:\n"""\n${quoted}\n"""\n\nMi pregunta sobre eso: ${prompt}`
    : prompt;

  await sock.sendMessage(jid, { text: 'Pensando...' }, { quoted: msg }).catch(() => {});

  try {
    const res = await axios.post(GROK_API, {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    }, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 90000,
    });

    const reply = res.data?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('Respuesta vacía de Grok');

    const chunks = chunkText(reply);
    for (let i = 0; i < chunks.length; i++) {
      await sock.sendMessage(jid, { text: chunks[i] }, i === 0 ? { quoted: msg } : {});
    }
  } catch (err) {
    const apiErr = err.response?.data?.error?.message || err.response?.data?.error || err.message;
    logger.error(`Grok error: ${typeof apiErr === 'string' ? apiErr : JSON.stringify(apiErr)}`);
    await sock.sendMessage(jid, {
      text: `Grok: ${typeof apiErr === 'string' ? apiErr : 'error desconocido'}`,
    }, { quoted: msg });
  }
}

// !setgrok <api_key>  — owner only, saves key persistently
async function cmdSetGrokKey(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender, msg.key.fromMe)) {
    return sock.sendMessage(jid, { text: 'Solo el owner puede configurar Grok.' }, { quoted: msg });
  }

  const key = (args || []).join(' ').trim();
  if (!key || !key.startsWith('xai-')) {
    return sock.sendMessage(jid, {
      text: 'Usa: *!setgrok xai-tu_clave*\n\nLa key empieza con "xai-". Conseguila gratis en console.x.ai',
    }, { quoted: msg });
  }

  try {
    await saveApiKey(key);
    await sock.sendMessage(jid, {
      text: 'Grok configurado correctamente. Ya podes usar *!g* en cualquier momento.\n\nPor seguridad, borra tu mensaje con la key del chat.',
    }, { quoted: msg });
  } catch (err) {
    logger.error(`setGrokKey error: ${err.message}`);
    await sock.sendMessage(jid, { text: `Error guardando key: ${err.message}` }, { quoted: msg });
  }
}

module.exports = { cmdGrok, cmdSetGrokKey };
