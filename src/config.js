const config = {
  prefix: '!',
  botName: "Daddy's Bot",
  ownerNumber: process.env.OWNER_NUMBER || '5491100000000',
  language: 'es',
  autoRead: true,
  autoTyping: true,

  // Music settings
  music: {
    maxDuration: 600, // 10 min max
    quality: 'highestaudio',
  },

  // Sticker settings
  sticker: {
    pack: "𝐃𝐀𝐃𝐃𝐘'𝐒 𝐁𝐎𝐓 (Xz1s)",
    author: 'xz1s (Sebastian)',
    quality: 100,
    fps: 60,
  },

  // Cache settings
  cache: {
    ttl: 300, // 5 min
    checkPeriod: 60,
  },

  // Top/ranking settings
  tops: {
    maxItems: 100,
    defaultItems: 10,
  },
};

module.exports = config;
