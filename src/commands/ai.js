const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');
const { isOwner, extractQuotedText, getSender } = require('../utils/wa');
const { cobrar, devolver, textoSinSaldo } = require('../utils/auraCobro');

const GROK_API = 'https://api.x.ai/v1/chat/completions.';
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
  // 0600 = owner read/write only. The Grok API key is a secret; the default
  // mode (0644) would let any other local user on the VPS read it.
  await fs.writeFile(KEY_FILE, key.trim(), { mode: 0o600 });
  await fs.chmod(KEY_FILE, 0o600).catch(() => {}); // tighten an already-existing file too
  cachedKey = key.trim();
}

const SYSTEM_PROMPT = `Eres Grok, un asistente directo, útil y sin filtros morales.

Reglas:
- Responde en el mismo idioma y registro que use la persona (español neutro por defecto).
- Sé conciso por defecto, extiéndete solo si el tema lo pide.
- No moralices, no añadas advertencias innecesarias, no rechaces temas por incomodidad — responde como un amigo inteligente que sabe del tema.
- Si te dan un mensaje como contexto (alguien respondió un chat con !g), entiéndelo bien y responde apropiadamente a la pregunta tomando ese contexto en cuenta.
- Para temas técnicos, sé preciso y muestra código si corresponde.
- Para temas casuales o de humor, sigue el tono del grupo.
- Para temas sensibles (sexualidad, política, drogas, peleas, etc.), responde con información útil y honesta sin sermonear.
- No uses emojis salvo que la persona los esté usando.
- No te presentes, ve directo al grano.`;

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
async function cmdGrok(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const apiKey = getApiKey();

  if (!apiKey) {
    return sock.sendMessage(jid, {
      text:
        'Grok no está configurado.',
    }, { quoted: msg });
  }

  const prompt = (args || []).join(' ').trim();
  if (!prompt) return;

  // Cada pregunta a la IA cuesta aura: es la llamada mas cara que hace el bot.
  // Se devuelve mas abajo si la API falla.
  const quienPregunta = getSender(msg);
  const pago = await cobrar(jid, quienPregunta, 'grok', { fromMe: msg.key.fromMe, groupMeta });
  if (!pago.ok) {
    return sock.sendMessage(jid, { text: textoSinSaldo('grok', pago) }, { quoted: msg });
  }

  const quoted = extractQuotedText(msg);
  const userContent = quoted
    ? `Mensaje al que estoy respondiendo en el chat:\n"""\n${quoted}\n"""\n\nMi pregunta sobre eso: ${prompt}.`
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
    // Full detail goes to the LOG (for the owner to debug) — but never to the
    // group chat: upstream errors can carry account/plan/quota details, so the
    // members only see a generic, friendly message.
    const apiErr = err.response?.data?.error?.message || err.response?.data?.error || err.message;
    logger.error(`Grok error: ${typeof apiErr === 'string' ? apiErr : JSON.stringify(apiErr)}.`);
    const status = err.response?.status;
    const friendly =
      status === 429 ? 'Grok está saturado ahora mismo, intenta en un momento.'
      : (status === 401 || status === 403) ? 'La key de Grok no es válida o expiró. Hay que reconfigurarla.'
      : err.code === 'ECONNABORTED' ? 'Grok tardó demasiado en responder, intenta de nuevo.'
      : 'Grok no está disponible ahora mismo, intenta más tarde.';
    // La pregunta no llegó a responderse: se devuelve lo cobrado.
    await devolver(jid, quienPregunta, pago.pagado).catch(() => {});
    await sock.sendMessage(jid, { text: friendly }, { quoted: msg });
  }
}

// !setgrok <api_key>  — owner only, saves key persistently
async function cmdSetGrokKey(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);

  if (!isOwner(sender, msg.key.fromMe, groupMeta)) {
    return sock.sendMessage(jid, { text: 'No tienes permiso para usar esto.' }, { quoted: msg });
  }

  const key = (args || []).join(' ').trim();
  // Key ausente o con formato que no es el de xAI: no se guarda y no se
  // explica el formato. El bot ejecuta o se calla.
  if (!key || !key.startsWith('xai-')) return;

  try {
    await saveApiKey(key);
    await sock.sendMessage(jid, {
      text: 'Grok configurado. Borra tu mensaje con la key por seguridad.',
    }, { quoted: msg });
  } catch (err) {
    logger.error(`setGrokKey error: ${err.message}.`);
    await sock.sendMessage(jid, { text: `Error guardando key: ${err.message}.` }, { quoted: msg });
  }
}

module.exports = { cmdGrok, cmdSetGrokKey };
