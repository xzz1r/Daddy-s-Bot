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
const { traer, buscar, buscarVarios, enlaceDe, plataformaDe, hayComoTraer, datosDeGif, prepararGif, PLATAFORMAS } = require('../utils/redes');
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

// ─── MIRAR NO ES MARCAR ─────────────────────────────────────────────────────
//
// Esto hacia las dos cosas de golpe, y marcaba AL ENTRAR AL COMANDO. O sea que
// un *!tt* con un enlace roto, o de alguien sin aura, fallaba al instante y
// dejaba a esa persona ocho segundos castigada sin haber ocupado nada. El freno
// existe para que uno no acapare los dos huecos de descarga; quien no llega a
// usar ninguno no tiene por que esperar a nada.
//
// Ahora se mira aqui y se marca abajo, justo antes de ponerse a bajar, que es
// cuando de verdad se ocupa el hueco.
function cuantoFalta(jid) {
  const antes = ultimoUso.get(canonicalJid(jid));
  if (!antes) return 0;
  const va = Date.now() - antes;
  return va < ESPERA_MS ? ESPERA_MS - va : 0;
}

function marcarUso(jid) {
  const k = canonicalJid(jid);
  if (ultimoUso.size >= MAX_RECORDADOS && !ultimoUso.has(k)) {
    ultimoUso.delete(ultimoUso.keys().next().value);
  }
  ultimoUso.set(k, Date.now());
}

// Y DESHACERLO. Si la cola estaba llena, no se llego a ocupar ningun hueco: el
// comando se quedo en la puerta. Cobrarle a esa persona ocho segundos de espera
// es el mismo fallo que marcar al entrar, solo que un poco mas abajo.
function olvidarUso(jid) {
  ultimoUso.delete(canonicalJid(jid));
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

// ─── CUANTAS FOTOS MANDA UN *!pin* ──────────────────────────────────────────
//
// Cinco. El dueño lo vio en otros bots —«envian mas de 10 fotos al mismo
// tiempo»— y eligio cinco a proposito: «para que no sea mucho spam».
//
// Solo la BUSQUEDA manda varias. *!next* sigue dando una —«otra» es una, no
// otras cinco— y un enlace concreto trae lo que hay en ese enlace y ya.
const FOTOS_POR_PIN = 5;
// WhatsApp corta los pies largos con un «ver más» y un tuit puede llevar cuatro
// mil caracteres. Por encima de esto el pie deja de ser un pie.
const TOPE_PIE = 900;

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
  // ESTE FRENO ES TUYO, NO DEL GRUPO. El aviso decia «hay dos descargas a la vez
  // para todo el grupo y las estas ocupando tu», y eso es falso: este reloj es
  // por persona y salta aunque los dos huecos esten libres. Decirle a alguien
  // que esta ocupando algo que no ocupa es mentirle, y ademas le manda a
  // esperar por el motivo equivocado. La cola llena es otra cosa y ahora se
  // dice aparte, mas abajo.
  const espera = cuantoFalta(quien);
  if (espera) {
    return sock.sendMessage(jid, {
      text: `Vas muy rápido. Espera ${Math.ceil(espera / 1000)} s antes de pedir otro.`,
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

  // AQUI SE MARCA EL RELOJ, y no al entrar. De aqui no se sale sin ocupar un
  // hueco de descarga: el enlace es bueno, la plataforma esta, y el aura ya
  // esta cobrada. Lo de antes castigaba por intentarlo.
  marcarUso(quien);

  let traido = null;
  const t0 = Date.now();
  try {
    traido = busqueda
      ? await buscarVarios(busqueda, `pin|${jid}|${busqueda.toLowerCase()}`, pinesDados,
        pinesDados ? 1 : FOTOS_POR_PIN)
      : await traer(url, plataforma);
  } catch (e) {
    logger.warn(`${plataforma}: ${e.message}`);
    await devolverAura();
    // HAY DOS MOTIVOS QUE SE DICEN EN EL GRUPO, y los dos por lo mismo: no se
    // arreglan reintentando y no son cosa del dueño, asi que quien pego el
    // enlace merece saberlo. Que pese de mas, y que eso no sea un video. El
    // resto de motivos salen en `npm run estado`, no aqui.
    const porTamano = /WhatsApp no pasa de|pesa \d+ MB/.test(e.message);
    // «ni fotos ni vídeo» es el tuit de solo texto: se dice tal cual, que es
    // distinto de «no he podido traerlo».
    // «ya no está» es el tuit borrado o de cuenta privada: X lo dice con todas
    // las letras y se repite tal cual. Echarle la culpa al bot de un tuit que
    // no existe hace que quien lo pego lo reintente tres veces.
    const sinVideo = /no es un vídeo|no trae vídeo|no trae ni fotos|ya no está/.test(e.message);
    // Y el tercero: no hay nada con ese nombre. Es el unico motivo de una
    // busqueda que quien la escribio puede arreglar — escribiendo otra cosa.
    const sinResultados = /no encontré nada/.test(e.message);
    // Y LA COLA LLENA, que hasta ahora se perdia. Los dos huecos estan cogidos
    // y hay ocho esperando: reintentar no lo arregla, lo empeora. Antes esto
    // caia en «no he podido traerlo de TikTok», que suena a que el enlace es
    // malo — asi que la gente lo reintentaba, y cada reintento llenaba mas la
    // cola. Va por la marca y no por el texto, que el texto cambia.
    const colaLlena = e.colaLlena === true;
    // Con la cola llena no se ocupo ningun hueco, asi que el reloj se borra:
    // si no, reintentar «en un momento» se encuentra con otros ocho segundos
    // de castigo por algo que no llego a pasar.
    if (colaLlena) olvidarUso(quien);
    const num = `@${String(quienCanon).split('@')[0]}`;
    const texto = colaLlena
      ? `${num} ahora mismo hay cola de descargas. Espera un momento y vuelve a pedirlo. No te he cobrado.`
      : porTamano
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
    // ─── UNA BUSQUEDA MANDA VARIAS; UN ENLACE, LA SUYA ────────────────────
    //
    // `buscarVarios` devuelve una lista; `traer` (un enlace concreto) devuelve
    // un medio suelto. Se normalizan aqui para que abajo haya un solo camino.
    const lote = Array.isArray(traido.medios) ? traido.medios : [traido];

    // ─── EN ALBUM, NO EN CINCO MENSAJES ───────────────────────────────────
    //
    // Cinco fotos sueltas son cinco burbujas empujando el chat hacia arriba, y
    // lo que pidio el dueño fue justo lo contrario: varias fotos SIN que sea
    // mucho spam. WhatsApp las agrupa en una sola burbuja si van colgadas de un
    // `albumMessage`.
    //
    // EL SOBRE SE MANDA DESPUES DE BAJARLAS, y ese orden es todo el asunto:
    // lleva escrito CUANTAS fotos esperar. Mandarlo antes y que luego falle una
    // descarga deja un album esperando para siempre una foto que no existe.
    // Aqui se manda con el numero que de verdad hay en la mano.
    //
    // Con una sola no hay album que montar: una burbuja de album con una foto
    // dentro se ve peor que la foto.
    const ids = [];
    let padre = null;
    if (lote.length > 1) {
      // El numero de cada tipo, contado de verdad. Escrito fijo en «todo
      // imagenes» valia mientras el album solo salia de *!pin*; un tuit puede
      // traer fotos y video a la vez, y un album que anuncia cuatro fotos y
      // recibe tres y un video se queda esperando la que falta.
      const fotos = lote.filter((m) => m.tipo === 'imagen').length;
      padre = await sock.sendMessage(jid, {
        album: { expectedImageCount: fotos, expectedVideoCount: lote.length - fotos },
      }, { quoted: msg }).catch((e) => {
        // Si el album no sale, no se pierde el comando: van sueltas.
        logger.warn(`${plataforma}: no pude abrir el album (${e.message}); las mando sueltas`);
        return null;
      });
      if (padre?.key?.id) ids.push(padre.key.id);
    }

    // ─── EL TEXTO DEL TUIT VA DE PIE ──────────────────────────────────────
    //
    // Lo pidio el dueño: «hay alguna forma de ver los headlines del tweet?».
    // Sin el, lo que llega al grupo es una imagen suelta sin contexto —y en un
    // tuit el texto SUELE SER la mitad del chiste, o la noticia entera—.
    //
    // Va como pie del PRIMER medio y no en un mensaje aparte: un mensaje mas es
    // otra burbuja empujando el chat, que es justo lo que se evito montando el
    // album. Y WhatsApp corta los pies muy largos con un «ver mas», asi que se
    // recorta antes: un tuit puede llevar cuatro mil caracteres.
    let pieTuit = String(traido.texto || '').trim();
    if (pieTuit.length > TOPE_PIE) pieTuit = `${pieTuit.slice(0, TOPE_PIE - 1).trimEnd()}…`;

    // ─── Y SI LA BUSQUEDA SE HA DADO LA VUELTA, SE DICE ───────────────────
    //
    // Cuando ya no quedan resultados sin ver, la busqueda vuelve a empezar. Eso
    // esta bien —mejor volver a empezar que no dar nada— pero se hacia EN
    // SILENCIO: alguien escribia *!next* esperando otra y recibia una de hace
    // cinco, sin ninguna señal. Pidio otra, no las de antes otra vez.
    //
    // Va en el pie y no en un mensaje aparte, por lo mismo que el texto de un
    // tuit: una burbuja mas es justo lo que el album evita. Aqui no chocan: un
    // tuit no se recicla y una busqueda no trae texto.
    if (traido.seAcabaron && !pieTuit) {
      pieTuit = `Ya te he enseñado todo lo que hay de «${busqueda}». Vuelvo a empezar.`;
    }

    let primero = true;
    for (const m of lote) {
      // `animado` viene marcado desde utils/redes.js cuando lo que se bajo es
      // un MP4 sin pista de audio, que es como X sirve los GIF. Con
      // gifPlayback WhatsApp lo pone en bucle y sin controles, igual que se ve
      // en la propia red; sin el llega como un clip mudo con boton de play.
      const pie = (primero && pieTuit) ? { caption: pieTuit } : {};
      primero = false;

      // ─── UN GIF NECESITA MINIATURA Y TAMAÑO; UN VIDEO NO ───────────────
      //
      // Aqui va `jpegThumbnail: null` a proposito en todo: lo que dispara el
      // ffmpeg interno de Baileys es `undefined`, y ese proceso de mas en el
      // unico core de la VPS es lo que hacia que subir 13 KB tardara 1699 ms.
      //
      // Pero esa misma puerta es la que rellena el ANCHO y el ALTO
      // (Utils/messages.js:135 de Baileys), asi que con null el mensaje sale
      // sin ninguno de los dos. A un video le da igual —tiene su burbuja y su
      // boton de play—, pero un `gifPlayback` se pinta en linea y en bucle: sin
      // relacion de aspecto no hay nada que dibujar, y en el grupo no pasa
      // nada. Es lo que el dueño veia: «los GIFs siguen sin funcionar», con el
      // fichero bajado y bien.
      //
      // Se los damos hechos, que ademas es lo que ya hacen las acciones y
      // *!tovid* —los dos sitios donde el gif si funcionaba—. Solo para gifs:
      // un video corriente no paga este ffmpeg.
      // Y EL GIF SE REHACE ANTES DE MEDIRLO. Con la miniatura puesta el gif ya
      // se dibujaba, pero seguia sin poder bajarse: WhatsApp lo descargaba, se
      // le daba a reproducir y volvia el boton de descarga. El fichero de X era
      // correcto por todos lados, asi que en vez de adivinar que campo del
      // contenedor le sienta mal se rehace con la receta de *!acciones*, cuyos
      // gif llevan meses reproduciendose en este grupo.
      if (m.animado) m.fichero = await prepararGif(m.fichero);
      const extraGif = m.animado ? await datosDeGif(m.fichero).catch(() => ({})) : null;

      const medio = m.tipo === 'imagen'
        ? { image: { url: m.fichero }, ...pie }
        : {
          video: { url: m.fichero },
          mimetype: 'video/mp4',
          jpegThumbnail: (extraGif && extraGif.thumb) || null,
          ...(m.animado ? { gifPlayback: true } : {}),
          ...(extraGif && extraGif.ancho ? { width: extraGif.ancho, height: extraGif.alto } : {}),
          // Baileys solo calcula la duracion del audio, asi que un video sale
          // siempre sin ella. Un gif se pinta en bucle y la necesita.
          ...(extraGif && extraGif.segundos ? { seconds: extraGif.segundos } : {}),
          ...pie,
        };
      // La cita solo en la primera cuando no hay album: colgar las cinco del
      // mismo mensaje repite el recuadro cinco veces.
      const extra = padre?.key ? { albumParentKey: padre.key } : {};
      const opciones = (!padre && ids.length === 0) ? { quoted: msg } : {};
      const enviado = await sock.sendMessage(jid, { ...medio, ...extra }, opciones);
      if (enviado?.key?.id) ids.push(enviado.key.id);
    }

    // Para que *!next* pueda continuar por aqui. Solo las busquedas: a un
    // enlace concreto no hay «siguiente» que darle.
    //
    // Se apuntan TODOS los ids, el del album incluido: si se mandan cinco
    // fotos, *!next* tiene que funcionar respondiendo a cualquiera de ellas y
    // no solo a una que nadie sabria cual es.
    if (busqueda) {
      for (const id of ids) recordarBusqueda(id, jid, busqueda, traido.pines || pinesDados);
    }
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
    for (const m of (Array.isArray(traido.medios) ? traido.medios : [traido])) {
      if (m?.fichero) await fs.remove(m.fichero).catch(() => {});
    }
  }

  const tSubir = Date.now() - t1;
  // EL DESGLOSE, SOLO CUANDO TARDA, igual que en las acciones. Bajar y subir son
  // dos problemas distintos con arreglos distintos, y un solo número no se puede
  // arreglar.
  if (tBajar + tSubir > 4000) {
    logger.warn(`${plataforma}: ${tBajar + tSubir} ms (bajar ${tBajar}, subir ${tSubir}, `
      + `${Math.round(((Array.isArray(traido.medios) ? traido.medios : [traido])
        .reduce((a, m) => a + (m?.bytes || 0), 0)) / 1024)} KB, ${traido.ext || 'jpg'})`);
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
const cmdX         = (sock, msg, args, groupMeta) => hazRed(sock, msg, args, groupMeta, 'x');

module.exports = { cmdTikTok, cmdInstagram, cmdPinterest, cmdX, cmdNext, _busquedas: busquedas, _hazRed: hazRed, _ESPERA_MS: ESPERA_MS };
