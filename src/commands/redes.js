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
const { traer, buscar, enlaceDe, plataformaDe, hayComoTraer, PLATAFORMAS } = require('../utils/redes');
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

// ─── *!next*: OTRO RESULTADO DE LA MISMA BUSQUEDA ───────────────────────────
//
// Lo pidio el dueño: «viene bien que al responderle a la imagen que el bot haya
// enviado, se le ponga /next, y ponga otro resultado de la misma busqueda».
//
// La busqueda se recuerda por el ID DEL MENSAJE QUE MANDO EL BOT, no por
// persona ni por grupo. Es lo que hace que funcione con varias busquedas vivas
// a la vez: en un grupo donde tres han pedido tres cosas distintas, cada *!next*
// continua la que tiene delante, porque se responde a UNA imagen concreta.
//
// Y encadena: el resultado de un *!next* se apunta igual, asi que se puede
// seguir dandole a la ultima imagen indefinidamente.
//
// Se guarda la lista ya ranqueada (huellas y URLs, no las fotos). *!next*
// baja al siguiente de ESA lista en vez de volver a preguntar a Pinterest
// y que el orden cambie. Las fotos no viven aqui: se bajan al mandarlas y
// se borran igual que siempre.
const MAX_BUSQUEDAS = 500;
const busquedas = new Map();   // id del mensaje del bot -> { consulta, jid, pines }

function recordarBusqueda(id, jid, consulta, pines) {
  if (!id) return;
  if (busquedas.size >= MAX_BUSQUEDAS) busquedas.delete(busquedas.keys().next().value);
  busquedas.set(id, {
    consulta,
    jid,
    pines: Array.isArray(pines) && pines.length ? pines : undefined,
  });
}

function busquedaCitada(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const id = ctx?.stanzaId;
  if (!id) return null;
  const v = busquedas.get(id);
  // Del mismo grupo: un id de otro chat no continua aqui.
  if (!v || v.jid !== msg.key.remoteJid) return null;
  return v;
}

async function hazRed(sock, msg, args, groupMeta, plataforma, consultaDada = null, pinesDados = null) {
  const jid = msg.key.remoteJid;
  const nombre = PLATAFORMAS[plataforma].nombre;
  const texto = args.join(' ');

  // SIN ENLACE NO SE COBRA. Cobrar y después decir "pon un enlace" es cobrar
  // por un rechazo, que es lo mismo que ya se corrigió en las acciones.
  const url = enlaceDe(texto, plataforma);

  // ─── *!pin* TAMBIÉN BUSCA, QUE ES PARA LO QUE SE USA ──────────────────────
  //
  // Lo pidió el dueño después de que una del grupo, que usa otros bots, dijera
  // que «el comando pin es para que pongas pin y el nombre de lo que quieras
  // buscar, no el enlace». Y es lo natural: a Pinterest se va a buscar cosas,
  // no a abrir un pin que ya tienes delante.
  //
  // El enlace no se toca: son dos usos del mismo comando y se distinguen solos
  // —si detrás hay una dirección de Pinterest se trae ese pin, y si hay texto
  // se busca—, así que nadie pierde lo que ya sabía escribir.
  //
  // Y NO SE LE CUELA UN ENLACE DE OTRA RED COMO BÚSQUEDA. Quien pega un TikTok
  // en *!pin* se ha equivocado de comando; buscar «https://vt.tiktok.com/…» en
  // Pinterest sería contestarle cualquier cosa en vez de decírselo.
  const otra = plataformaDe(texto);
  const busqueda = consultaDada || (!url && plataforma === 'pinterest' && texto.trim() && !otra
    ? texto.trim()
    : null);

  if (!url && !busqueda) {
    // Y si pegó uno de OTRA red, se le dice cuál era el suyo en vez de un "uso:"
    // genérico: el error casi siempre es ese, no el de no poner nada.
    const aviso = otra && otra !== plataforma
      ? `Ese enlace es de ${PLATAFORMAS[otra].nombre}. Aquí va el de ${nombre}.`
      : plataforma === 'pinterest'
        ? `Escribe qué buscar detrás del comando, o pega el enlace de ${nombre}.`
        : `Pega el enlace de ${nombre} detrás del comando.`;
    return sock.sendMessage(jid, { text: aviso }, { quoted: msg });
  }

  // SIN POR DONDE TRAERLO, NI SE COBRA NI SE INTENTA. Sin API para esa
  // plataforma y sin yt-dlp no hay nada que probar: cobrar, esperar veinte
  // segundos y devolver el aura es gastarle el tiempo a alguien para acabar
  // donde ya se sabía. Y el mensaje no dice qué falta: eso es cosa del dueño y
  // sale en `npm run estado`, no en el grupo.
  // La búsqueda no pasa por la API ni por yt-dlp: lee la página de resultados y
  // ya. Así que esta puerta no la afecta — y si la afectara, *!pin gatos*
  // diría «no está disponible» en una máquina donde funciona perfectamente.
  if (!busqueda && !hayComoTraer(plataforma)) {
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

  // ─── EL ENLACE SE BORRA EN CUANTO EL BOT SE PONE A ELLO ───────────────────
  //
  // Lo pidio el dueño: «que no haya links en el grupo». El comando lleva la
  // direccion dentro, asi que dejarlo puesto es dejar el enlace puesto, y el
  // grupo se llena de direcciones de TikTok que ya nadie va a tocar.
  //
  // SE BORRA DESPUES DE COBRAR, no antes. Antes estan las tres salidas en las
  // que el comando no llega a ejecutarse —sin enlace, en espera, sin saldo— y
  // en esas el mensaje tiene que seguir ahi: la respuesta va citandolo, y citar
  // a un muerto no se entiende.
  //
  // Y SE SIGUE CITANDO, aunque el mensaje citado ya no este.
  //
  // Aqui lo quite: el recuadro de la cita lleva dentro el texto del citado, asi
  // que citar el comando vuelve a enseñar el enlace justo despues de borrarlo.
  // El dueño lo decidio al reves, y tiene razon en lo que importa: la cita es
  // lo que dice DE QUIEN es el video, y en un grupo donde tres personas piden a
  // la vez eso no lo resuelve una mencion. El enlace del recuadro no se lo va a
  // copiar nadie letra por letra.
  //
  // La mencion se queda solo para los avisos de error, donde no hay video que
  // colgar de la cita y lo unico que hace falta es que le llegue el aviso a
  // quien lo pidio.
  //
  // Y SOLO SI HAY ENLACE QUE BORRAR. Un *!pin gatos* no tiene ninguno, asi que
  // borrarlo no quita nada del grupo: deja un «este mensaje fue eliminado por
  // el admin» a cambio de nada, y encima hace desaparecer lo que se pidio.
  const quienCanon = canonicalJid(quien) || quien;
  const deQuien = { mentions: [quienCanon] };
  if (url) {
    sock.sendMessage(jid, {
      delete: { remoteJid: jid, fromMe: Boolean(msg.key.fromMe), id: msg.key.id, participant: quien },
    }).catch(() => {});
  }

  let traido = null;
  const t0 = Date.now();
  try {
    traido = busqueda
      ? await buscar(busqueda, `pin|${jid}|${busqueda.toLowerCase()}`, pinesDados)
      : await traer(url, plataforma);
  } catch (e) {
    logger.warn(`${plataforma}: ${e.message}`);
    await devolverAura();
    // HAY DOS MOTIVOS QUE SE DICEN EN EL GRUPO, y los dos por lo mismo: no se
    // arreglan reintentando y no son cosa del dueño, asi que quien pego el
    // enlace merece saberlo. Que pese de mas, y que eso no sea un video. El
    // resto de motivos salen en `npm run estado`, no aqui.
    const porTamano = /WhatsApp no pasa de|pesa \d+ MB/.test(e.message);
    const sinVideo = /no es un vídeo|no trae vídeo/.test(e.message);
    // Y el tercero: no hay nada con ese nombre. Es el unico motivo de una
    // busqueda que quien la escribio puede arreglar — escribiendo otra cosa.
    const sinResultados = /no encontré nada/.test(e.message);
    const num = `@${String(quienCanon).split('@')[0]}`;
    const texto = porTamano
      ? `${num} ese vídeo ${e.message.replace(/^.*?(pesa)/, '$1')} MB. No te he cobrado.`
      : sinVideo || sinResultados
        ? `${num} ${e.message}. No te he cobrado.`
        : busqueda
          ? `${num} no he podido buscar en ${nombre} ahora mismo. No te he cobrado.`
          : `${num} no he podido traerlo de ${nombre}. No te he cobrado.`;
    // La busqueda no borra el mensaje, asi que el aviso puede citarlo y no
    // hace falta la mencion.
    return busqueda
      ? sock.sendMessage(jid, { text: texto.replace(`${num} `, '') }, { quoted: msg })
      : sock.sendMessage(jid, { text: texto, ...deQuien });
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
    const enviado = await sock.sendMessage(jid, medio, { quoted: msg });
    // Para que *!next* pueda continuar por aqui. Solo las busquedas: a un
    // enlace concreto no hay «siguiente» que darle.
    if (busqueda) recordarBusqueda(enviado?.key?.id, jid, busqueda, traido.pines || pinesDados);
  } catch (e) {
    logger.warn(`${plataforma}: no pude mandarlo (${e.message})`);
    await devolverAura();
    return sock.sendMessage(jid, {
      text: `@${String(quienCanon).split('@')[0]} lo bajé pero WhatsApp no lo aceptó. No te he cobrado.`,
      ...deQuien,
    });
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

// *!next* sobre la imagen que mando el bot: otra de la misma busqueda.
async function cmdNext(sock, msg, args, groupMeta) {
  const jid = msg.key.remoteJid;
  const v = busquedaCitada(msg);
  if (!v) {
    return sock.sendMessage(jid, {
      text: 'Responde con *!next* a una foto que haya mandado el bot buscando algo.',
    }, { quoted: msg });
  }
  return hazRed(sock, msg, [], groupMeta, 'pinterest', v.consulta, v.pines);
}

const cmdTikTok    = (sock, msg, args, groupMeta) => hazRed(sock, msg, args, groupMeta, 'tiktok');
const cmdInstagram = (sock, msg, args, groupMeta) => hazRed(sock, msg, args, groupMeta, 'instagram');
const cmdPinterest = (sock, msg, args, groupMeta) => hazRed(sock, msg, args, groupMeta, 'pinterest');

module.exports = { cmdTikTok, cmdInstagram, cmdPinterest, cmdNext, _busquedas: busquedas, _hazRed: hazRed, _ESPERA_MS: ESPERA_MS };
