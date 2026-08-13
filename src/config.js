const config = {
  prefix: '!',
  botName: "Daddy's Bot",
  ownerNumber: process.env.OWNER_NUMBER || '5491100000000',
  // Co-owners: mismos privilegios que el owner. Se definen en .env como
  // CO_OWNERS=numero1,numero2 para no dejar ningún número real escrito en el
  // código. Vacío por defecto.
  coOwners: (process.env.CO_OWNERS || '')
    .split(',')
    .map(n => n.replace(/\D/g, ''))
    .filter(Boolean),
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

  // API de terceros para descargar audio de YouTube SIN que. el bot toque YouTube
  // (la extracción corre en la IP del servicio, no en la nuestra, así se evita el
  // bot-check del datacenter). Es la fuente principal de !play para canciones
  // populares completas. Se usa RapidAPI ("YouTube MP3" de ytjar por defecto).
  // Registro gratis en rapidapi.com; la key va en .env como RAPIDAPI_KEY=...
  // Si está vacía, !play usa solo SoundCloud como respaldo.
  rapidApiKey: process.env.RAPIDAPI_KEY || '',
  rapidApiHost: process.env.RAPIDAPI_HOST || 'youtube-mp36.p.rapidapi.com',

  sticker: {
    pack: "𝐃𝐀𝐃𝐃𝐘'𝐒 𝐁𝐎𝐓",
    author: 'xz1s (Sebastian)',
  },
};

module.exports = config;
