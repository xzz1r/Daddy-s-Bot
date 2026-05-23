const axios = require('axios');
const logger = require('../utils/logger');

const GROK_API = 'https://api.x.ai/v1/chat/completions';
const MODEL = 'grok-2-latest';

function extractQuotedText(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) return null;
  return (
    quoted.conversation ||
    quoted.extendedTextMessage?.text ||
    quoted.imageMessage?.caption ||
    quoted.videoMessage?.caption ||
    null
  );
}

// !g <prompt> — Grok AI; if replying to a message, uses it as context
async function cmdGrok(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

  if (!apiKey) {
    return sock.sendMessage(jid, {
      text: '❌ Falta API key de Grok.\nConfigurala en Termux:\n\n*export GROK_API_KEY="tu_clave"*\n\nObtenela en console.x.ai',
    }, { quoted: msg });
  }

  const prompt = (args || []).join(' ').trim();
  if (!prompt) {
    return sock.sendMessage(jid, { text: '❌ Usa: *!g* <pregunta>\nO respondé a un mensaje con *!g <pregunta>*' }, { quoted: msg });
  }

  const quotedText = extractQuotedText(msg);
  const userContent = quotedText
    ? `Contexto (mensaje al que estoy respondiendo): "${quotedText}"\n\nMi pregunta: ${prompt}`
    : prompt;

  await sock.sendMessage(jid, { text: '...' }, { quoted: msg });

  try {
    const res = await axios.post(GROK_API, {
      model: MODEL,
      messages: [
        { role: 'system', content: 'Sos un asistente directo y conciso. Respondé en español rioplatense salvo que pidan otro idioma.' },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
    }, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 60000,
    });

    const reply = res.data?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('Respuesta vacía de Grok');

    await sock.sendMessage(jid, { text: reply }, { quoted: msg });
  } catch (err) {
    const apiErr = err.response?.data?.error?.message || err.message;
    logger.error(`Grok error: ${apiErr}`);
    await sock.sendMessage(jid, { text: `❌ Grok: ${apiErr}` }, { quoted: msg });
  }
}

module.exports = { cmdGrok };
