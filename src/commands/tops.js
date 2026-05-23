const { getTop, formatTop, topProviders } = require('../utils/tops');
const { parseNumber } = require('../utils/helpers');
const logger = require('../utils/logger');

// !top <categoria> [cantidad]
async function cmdTop(sock, msg, args) {
  const jid = msg.key.remoteJid;

  if (!args.length) {
    const cats = Object.keys(topProviders).join(', ');
    return sock.sendMessage(jid, {
      text: `*Uso:* !top <categoria> [cantidad]\n\n*Categorias disponibles:*\nmusica | peliculas | series\njuegos | youtube | spotify\nanime | paises | cripto | apps\n\n*Ejemplos:*\n!top musica 10\n!top cripto 20\n!top anime 5`,
    }, { quoted: msg });
  }

  const category = args[0]?.toLowerCase();
  const limit = parseNumber(args[1], 10, 100);

  await sock.sendMessage(jid, { text: `Obteniendo top ${limit} de *${category}*...` }, { quoted: msg });

  try {
    const { items } = await getTop(category, limit);
    if (!items.length) {
      return sock.sendMessage(jid, { text: 'No se encontraron resultados.' }, { quoted: msg });
    }
    const text = formatTop(category, items);
    await sock.sendMessage(jid, { text }, { quoted: msg });
    logger.success(`Top ${limit} ${category} enviado`);
  } catch (err) {
    logger.error(`Top error: ${err.message}`);
    await sock.sendMessage(jid, { text: err.message }, { quoted: msg });
  }
}

module.exports = { cmdTop };
