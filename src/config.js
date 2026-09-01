// LOS PREFIJOS, EN ORDEN. El primero es el canonico: el que se imprime en el
// menu, en los avisos y en el corrector. Los demas se aceptan igual pero no se
// enseñan.
//
// Darle la vuelta al bot entero —que pase a hablar de */aura* en vez de
// *!aura*— es cambiar el orden de esta lista y nada mas: el menu, la tienda y
// los avisos salen todos de aqui.
const PREFIJOS = ['!', '/'];

const config = {
  // EL PREFIJO QUE SE ENSEÑA. Uno solo, y es el primero de la lista.
  //
  // El menu, los avisos y el corrector imprimen este. Enseñar los dos en cada
  // linea doblaria la longitud del menu para decir lo mismo dos veces.
  prefix: PREFIJOS[0],

  // LOS PREFIJOS QUE SE ENTIENDEN. Lo que el bot ACEPTA, que no es lo mismo que
  // lo que enseña.
  //
  // La barra se admite porque es lo que escriben los dedos al venir de casi
  // cualquier otra app, y porque un comando que no responde no parece un
  // prefijo equivocado: parece un bot caido. Quien escriba */aura* recibe su
  // tirada; el menu le seguira diciendo *!aura*.
  //
  // El primero es el canonico y ES `prefix`, no una copia que haya que mantener
  // igual a mano. `npm run check` sigue comprobandolo por si alguien vuelve a
  // escribir el simbolo suelto ahi arriba.
  prefijos: PREFIJOS,
  botName: "Daddy's Bot",
  ownerNumber: process.env.OWNER_NUMBER || '5491100000000',
  // Co-owners: mismos privilegios que el owner. Se definen en .env como
  // CO_OWNERS=numero1,numero2 para no dejar ningún número real escrito en el
  // código. Vacío por defecto.
  coOwners: (process.env.CO_OWNERS || '')
    .split(',')
    .map(n => n.replace(/\D/g, ''))
    .filter(Boolean),
  // Amaño de !ship: con estos numeros, al owner le sale compatibilidad ALTA en
  // vez del 0-12 que le sale con todo el mundo. Se definen en .env como
  // SHIP_ALTO=numero1,numero2 por el mismo motivo que CO_OWNERS — no dejar
  // ningun numero real escrito en el codigo, que ademas aqui es de un tercero
  // que no ha pedido salir en un repositorio.
  //
  // Se guardan como digitos a secas; la comparacion la hace ship.js, que se
  // encarga del lio de los JID argentinos (ver alli).
  shipAlto: (process.env.SHIP_ALTO || '')
    .split(',')
    .map(n => n.replace(/\D/g, ''))
    .filter(Boolean),

  // Solo se usa en comandos (messageHandler), no en cada mensaje del grupo.
  // EL VISTO, Y CON EL LA PRESENCIA. Encenderlo hace dos cosas a la vez y hay
  // que saberlo: el bot marca como leido todo lo que le llega en los grupos, y
  // para que eso se VEA tiene que anunciarse en linea (WhatsApp no pinta el
  // visto de un cliente que dice no estar; ver la nota en bot.js). O sea que el
  // bot aparecera "en linea" mientras este conectado.
  //
  // Apagarlo devuelve las dos: ni marca ni sale en linea.
  autoRead: true,

  // Key de la API de búsqueda facial de Lenso.ai (plan Developer). Opcional:
  // sin ella, !fk solo da los enlaces manuales; con ella, hace la búsqueda
  // facial automática y muestra las coincidencias. Se pone en el archivo .env
  // como LENSO_API_KEY=... para no dejarla escrita en el código.
  lensoApiKey: process.env.LENSO_API_KEY || '',

  // Key de la API facial de FaceCheck.id (de pago, ~$0.30 por búsqueda). Opcional,
  // igual que Lenso: con ella, !fk muestra los resultados directos de FaceCheck.
  // Va en .env como FACECHECK_API_KEY=...
  facecheckApiKey: process.env.FACECHECK_API_KEY || '',

  // API de terceros para descargar audio de YouTube SIN que el bot toque YouTube
  // (la extracción corre en la IP del servicio, no en la nuestra, así se evita el
  // bot-check del datacenter). Es la fuente principal de !play para canciones
  // populares completas. Se usa RapidAPI ("YouTube MP3" de ytjar por defecto).
  // Registro gratis en rapidapi.com; la key va en .env como RAPIDAPI_KEY=...
  // Si está vacía, !play usa solo SoundCloud como respaldo.
  rapidApiKey: process.env.RAPIDAPI_KEY || '',
  rapidApiHost: process.env.RAPIDAPI_HOST || 'youtube-mp36.p.rapidapi.com',

  // Numero de contacto del menu. VACIO POR DEFECTO, Y A PROPOSITO.
  //
  // Aqui habia un numero de telefono real escrito a mano, y el menu lo sacaba
  // con la frase "Contactar al creador del bot". O sea que cualquiera que
  // escribiera !help se llevaba un numero y a quien pertenece el bot — que es
  // justo lo que no puede pasar. Y estando escrito en el codigo, ademas
  // quedaba en el repositorio y en su historial, donde no lo borra ponerlo
  // privado despues.
  //
  // Es la misma politica que ya seguian CO_OWNERS y SHIP_ALTO doce lineas mas
  // arriba: ningun numero real en el codigo. Aquella se aplico a los dos datos
  // internos y se salto justo en el unico que salia por pantalla.
  //
  // Si esta vacio, el menu no enseña ninguna linea de contacto. Quien quiera
  // una la pone en .env como CONTACTO=..., solo digitos y sin el +.
  contacto: (process.env.CONTACTO || '').replace(/\D/g, ''),

  // EL AUTOR DEL STICKER LO VE TODO EL QUE LO RECIBE.
  //
  // Aqui ponia 'xz1s', que es una cuenta del dueño. Y no es un dato interno:
  // WhatsApp lo escribe en los metadatos del sticker y lo enseña en la ficha del
  // pack, asi que cada sticker que ha hecho el bot lleva ese nombre encima y
  // sale del grupo con el —reenviado a cualquier otro chat, a cualquier otra
  // persona—. Lo mismo con el id del pack, que era 'com.xz1s.daddysbot'.
  //
  // El bot firma como el bot. Ninguna cuenta de nadie.
  sticker: {
    pack: "𝐃𝐀𝐃𝐃𝐘'𝐒 𝐁𝐎𝐓",
    author: "𝐃𝐀𝐃𝐃𝐘'𝐒 𝐁𝐎𝐓",
  },
};

// Con que prefijo viene un texto, o null si no viene con ninguno. Es la unica
// forma de preguntar "¿esto es un comando?": comparar contra `prefix` a pelo
// deja fuera la barra en el sitio donde se olvide, y esos olvidos no dan error
// —simplemente ese camino deja de reconocer la mitad de los comandos.
function prefijoDe(text) {
  if (typeof text !== 'string') return null;
  for (const p of config.prefijos) if (text.startsWith(p)) return p;
  return null;
}

// El texto sin su prefijo. Cadena vacia si no era un comando.
function sinPrefijo(text) {
  const p = prefijoDe(text);
  return p === null ? '' : text.slice(p.length);
}

config.prefijoDe = prefijoDe;
config.sinPrefijo = sinPrefijo;

module.exports = config;
