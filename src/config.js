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

  sticker: {
    pack: "𝐃𝐀𝐃𝐃𝐘'𝐒 𝐁𝐎𝐓",
    author: 'xz1s (Sebastian)',
  },
};

module.exports = config;
