const axios = require('axios');
const logger = require('../utils/logger');

const GROK_API = 'https://api.x.ai/v1/chat/completions';
const MODEL = process.env.GROK_MODEL || 'grok-2-latest';

// Sin restricciones, directo, adaptable. Se acopla a cualquier tema o tono.
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
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const q = ctx?.quotedMessage;
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

// Split very long replies so WhatsApp doesn't truncate / so they render properly
function chunkText(text, maxLen = 3500) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    // Try to split at a paragraph break
    let cut = remaining.lastIndexOf('\n\n', maxLen);
    if (cut < maxLen / 2) cut = remaining.lastIndexOf('\n', maxLen);
    if (cut < maxLen / 2) cut = remaining.lastIndexOf('. ', maxLen);
    if (cut < maxLen / 2) cut = maxLen;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

// Core function — used by both !g and the auto-reply
async function runGrok(sock, msg, prompt, contextText = null, { quietStart = false } = {}) {
  const jid = msg.key.remoteJid;
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

  if (!apiKey) {
    return sock.sendMessage(jid, {
      text:
        '❌ Falta API key de Grok.\n\n' +
        'En Termux ejecutá:\n' +
        '*echo \'export GROK_API_KEY="tu_clave"\' >> ~/.bashrc*\n' +
        '*source ~/.bashrc*\n\n' +
        'Obtené la clave gratis en console.x.ai',
    }, { quoted: msg });
  }

  if (!prompt || !prompt.trim()) return;

  const userContent = contextText
    ? `Mensaje al que estoy respondiendo en el chat:\n"""\n${contextText}\n"""\n\nMi pregunta sobre eso: ${prompt}`
    : prompt;

  if (!quietStart) {
    await sock.sendMessage(jid, { text: '🤖 Pensando...' }, { quoted: msg }).catch(() => {});
  }

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
      text: `❌ Grok: ${typeof apiErr === 'string' ? apiErr : 'error desconocido'}`,
    }, { quoted: msg });
  }
}

// !g <pregunta>   |   reply + !g <pregunta>
async function cmdGrok(sock, msg, args) {
  const prompt = (args || []).join(' ').trim();
  if (!prompt) {
    return sock.sendMessage(msg.key.remoteJid, {
      text: '❌ Usa: *!g* <pregunta>\nO respondé a un mensaje con *!g <pregunta>*.',
    }, { quoted: msg });
  }
  const quotedText = extractQuoted(msg);
  return runGrok(sock, msg, prompt, quotedText, { quietStart: false });
}

module.exports = { cmdGrok, runGrok, extractQuoted };
