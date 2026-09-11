'use strict';

// `!tt`, `!ig`, `!pin` — el vídeo que alguien pega, sin marca de agua.
//
// TRES COMANDOS Y NO UNO, por decisión del dueño: son tres plataformas
// distintas y se piden distinto. Lo que comparten —cobrar, bajar, mandar desde
// disco, borrar y devolver el aura si no llega nada— vive en `hazRed` y se
// escribe una vez; lo único propio de cada uno es su nombre y su enlace.
//
// El motor está en utils/redes.js, con el porqué de cada decisión: no se
// reencoda, no se carga en memoria y no se guarda nada.

const fs = require('fs-extra');
const { traer, enlaceDe, plataformaDe, hayComoTraer, PLATAFORMAS } = require('../utils/redes');
const { getSender, canonicalJid } = require('../utils/wa');
const { cobrar, devolver, textoSinSaldo } = require('../utils/auraCobro');
const logger = require('../utils/logger');

// UN ENLACE CADA OCHO SEGUNDOS POR PERSONA. No es por el precio —el aura ya
// frena eso— sino por los dos huecos de descarga que hay para todo el bot: sin
// esto, alguien pegando cinco enlaces seguidos deja a los demás sin `!play` y
// sin acciones mientras duran. Es el mismo freno que ya tenía !play.
const ESPERA_MS = 8000;
const MAX_RECORDADOS = 2000;
const ultimoUso = new Map();

function enEspera(jid) {
  const k = canonicalJid(jid);
  const antes = ultimoUso.get(k);
  const ahora = Date.now();
  if (antes && ahora - antes < ESPERA_MS) return ESPERA_MS - (ahora - antes);
  if (ultimoUso.size >= MAX_RECORDADOS && !ultimoUso.has(k)) {
    ultimoUso.delete(ultimoUso.keys().next().value);
  }
  ultimoUso.set(k, ahora);
  return 0;
}

async function hazRed(sock, msg, args, groupMeta, plataforma) {
  const jid = msg.key.remoteJid;
  const nombre = PLATAFORMAS[plataforma].nombre;
  const texto = args.join(' ');

  // SIN ENLACE NO SE COBRA. Cobrar y después decir "pon un enlace" es cobrar
  // por un rechazo, que es lo mismo que ya se corrigió en las acciones.
  const url = enlaceDe(texto, plataforma);
  if (!url) {
    // Y si pegó uno de OTRA red, se le dice cuál era el suyo en vez de un "uso:"
    // genérico: el error casi siempre es ese, no el de no poner nada.
    const otra = plataformaDe(texto);
    const aviso = otra && otra !== plataforma
      ? `Ese enlace es de ${PLATAFORMAS[otra].nombre}. Aquí va el de ${nombre}.`
      : `Pega el enlace de ${nombre} detrás del comando.`;
    return sock.sendMessage(jid, { text: aviso }, { quoted: msg });
  }

  // SIN POR DONDE TRAERLO, NI SE COBRA NI SE INTENTA. Sin API para esa
  // plataforma y sin yt-dlp no hay nada que probar: cobrar, esperar veinte
  // segundos y devolver el aura es gastarle el tiempo a alguien para acabar
  // donde ya se sabía. Y el mensaje no dice qué falta: eso es cosa del dueño y
  // sale en `npm run estado`, no en el grupo.
  if (!hayComoTraer(plataforma)) {
    logger.warn(`${plataforma}: sin API y sin yt-dlp, no hay por dónde traerlo`);
    return sock.sendMessage(jid, { text: `${nombre} no está disponible ahora mismo.` }, { quoted: msg });
  }

  const quien = getSender(msg);
  const espera = enEspera(quien);
  if (espera) {
    return sock.sendMessage(jid, {
      text: `Espera ${Math.ceil(espera / 1000)} s. Hay dos descargas a la vez para todo el grupo y las estás ocupando tú.`,
    }, { quoted: msg });
  }

  const pago = await cobrar(jid, quien, 'redes', { fromMe: msg.key.fromMe, groupMeta });
  if (!pago.ok) {
    return sock.sendMessage(jid, { text: textoSinSaldo('redes', pago, jid) }, { quoted: msg });
  }
  const devolverAura = () => devolver(jid, quien, pago.pagado, 'redes').catch(() => {});

  let traido = null;
  const t0 = Date.now();
  try {
    traido = await traer(url, plataforma);
  } catch (e) {
    logger.warn(`${plataforma}: ${e.message}`);
    await devolverAura();
    // HAY DOS MOTIVOS QUE SE DICEN EN EL GRUPO, y los dos por lo mismo: no se
    // arreglan reintentando y no son cosa del dueño, asi que quien pego el
    // enlace merece saberlo. Que pese de mas, y que eso no sea un video. El
    // resto de motivos salen en `npm run estado`, no aqui.
    const porTamano = /WhatsApp no pasa de|pesa \d+ MB/.test(e.message);
    const sinVideo = /no es un vídeo|no trae vídeo/.test(e.message);
    return sock.sendMessage(jid, {
      text: porTamano
        ? `Ese vídeo ${e.message.replace(/^.*?(pesa)/, '$1')} MB. No te he cobrado.`
        : sinVideo
          ? `${e.message.charAt(0).toUpperCase()}${e.message.slice(1)}. No te he cobrado.`
          : `No he podido traerlo de ${nombre}. No te he cobrado.`,
    }, { quoted: msg });
  }

  const tBajar = Date.now() - t0;
  const t1 = Date.now();
  try {
    // DESDE EL DISCO, NO DESDE UN BUFFER: Baileys abre un createReadStream con
    // una ruta, así que un vídeo de 25 MB no son 25 MB de RAM del bot.
    //
    // Y `jpegThumbnail: null`, no `undefined`: lo que dispara el ffmpeg interno
    // de Baileys al enviar es `undefined`, y ese proceso de más en el único core
    // de la VPS es lo que hacía que subir 13 KB tardara 1699 ms.
    const medio = traido.tipo === 'imagen'
      ? { image: { url: traido.fichero } }
      : { video: { url: traido.fichero }, mimetype: 'video/mp4', jpegThumbnail: null };
    await sock.sendMessage(jid, medio, { quoted: msg });
  } catch (e) {
    logger.warn(`${plataforma}: no pude mandarlo (${e.message})`);
    await devolverAura();
    return sock.sendMessage(jid, {
      text: `Lo bajé pero WhatsApp no lo aceptó. No te he cobrado.`,
    }, { quoted: msg });
  } finally {
    // SE BORRA SIEMPRE, salga bien o mal. El bot no guarda vídeos de nadie: lo
    // que se quede atrás por un corte lo recoge el barrido horario de temp.
    await fs.remove(traido.fichero).catch(() => {});
  }

  const tSubir = Date.now() - t1;
  // EL DESGLOSE, SOLO CUANDO TARDA, igual que en las acciones. Bajar y subir son
  // dos problemas distintos con arreglos distintos, y un solo número no se puede
  // arreglar.
  if (tBajar + tSubir > 4000) {
    logger.warn(`${plataforma}: ${tBajar + tSubir} ms (bajar ${tBajar}, subir ${tSubir}, `
      + `${Math.round(traido.bytes / 1024)} KB, ${traido.ext})`);
  }
}

const cmdTikTok    = (sock, msg, args, groupMeta) => hazRed(sock, msg, args, groupMeta, 'tiktok');
const cmdInstagram = (sock, msg, args, groupMeta) => hazRed(sock, msg, args, groupMeta, 'instagram');
const cmdPinterest = (sock, msg, args, groupMeta) => hazRed(sock, msg, args, groupMeta, 'pinterest');

module.exports = { cmdTikTok, cmdInstagram, cmdPinterest, _hazRed: hazRed, _ESPERA_MS: ESPERA_MS };
