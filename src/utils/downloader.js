const ytdl = require('ytdl-core');
const axios = require('axios');
const fs = require('fs-extra');
const { tempFile, cleanTemp } = require('./helpers');
const logger = require('./logger');

// Search YouTube without API key using scraping
async function searchYouTube(query) {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://www.youtube.com/results?search_query=${encoded}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
      timeout: 10000,
    });

    const match = res.data.match(/var ytInitialData = (.+?);<\/script>/s);
    if (!match) throw new Error('No se encontraron resultados');

    const data = JSON.parse(match[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;

    if (!contents) throw new Error('No se encontraron resultados');

    const videos = [];
    for (const item of contents) {
      const video = item?.videoRenderer;
      if (!video) continue;
      const id = video.videoId;
      const title = video.title?.runs?.[0]?.text;
      const duration = video.lengthText?.simpleText;
      const channel = video.ownerText?.runs?.[0]?.text;
      const views = video.viewCountText?.simpleText;
      if (id && title) {
        videos.push({ id, title, duration, channel, views, url: `https://www.youtube.com/watch?v=${id}` });
      }
      if (videos.length >= 5) break;
    }

    return videos;
  } catch (err) {
    logger.error(`YouTube search error: ${err.message}`);
    throw new Error('Error al buscar en YouTube');
  }
}

async function downloadAudio(videoUrl) {
  const outFile = tempFile('mp3');
  try {
    const info = await ytdl.getInfo(videoUrl);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    const duration = parseInt(info.videoDetails.lengthSeconds, 10);

    if (duration > 600) throw new Error('El video es muy largo (máx 10 min)');

    const title = info.videoDetails.title;
    const thumbnail = info.videoDetails.thumbnails?.slice(-1)[0]?.url;
    const author = info.videoDetails.author?.name;

    await new Promise((resolve, reject) => {
      const stream = ytdl.downloadFromInfo(info, { format });
      const writeStream = fs.createWriteStream(outFile);
      stream.pipe(writeStream);
      stream.on('error', reject);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    return { filePath: outFile, title, thumbnail, author, duration };
  } catch (err) {
    await cleanTemp(outFile);
    throw err;
  }
}

async function downloadBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(res.data);
}

module.exports = { searchYouTube, downloadAudio, downloadBuffer };
