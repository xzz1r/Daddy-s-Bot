const axios = require('axios');

// Top categories with their fetch functions
const topProviders = {
  musica: fetchTopMusic,
  peliculas: fetchTopMovies,
  series: fetchTopSeries,
  juegos: fetchTopGames,
  youtube: fetchTopYouTube,
  spotify: fetchTopSpotify,
  anime: fetchTopAnime,
  paises: fetchTopCountries,
  cripto: fetchTopCrypto,
  apps: fetchTopApps,
};

async function fetchTopMusic(limit = 10) {
  const res = await axios.get(`https://itunes.apple.com/us/rss/topalbums/limit=${limit}/json`, { timeout: 8000 });
  const entries = res.data?.feed?.entry || [];
  return entries.slice(0, limit).map((e, i) => ({
    pos: i + 1,
    name: e['im:name']?.label || 'Unknown',
    detail: e['im:artist']?.label || '',
  }));
}

async function fetchTopMovies(limit = 10) {
  const res = await axios.get(`https://itunes.apple.com/us/rss/topmovies/limit=${limit}/json`, { timeout: 8000 });
  const entries = res.data?.feed?.entry || [];
  return entries.slice(0, limit).map((e, i) => ({
    pos: i + 1,
    name: e['im:name']?.label || 'Unknown',
    detail: e['im:price']?.label || '',
  }));
}

async function fetchTopSeries(limit = 10) {
  const res = await axios.get(`https://itunes.apple.com/us/rss/toptvshows/limit=${limit}/json`, { timeout: 8000 });
  const entries = res.data?.feed?.entry || [];
  return entries.slice(0, limit).map((e, i) => ({
    pos: i + 1,
    name: e['im:name']?.label || 'Unknown',
    detail: e['im:artist']?.label || '',
  }));
}

async function fetchTopGames(limit = 10) {
  const res = await axios.get(`https://itunes.apple.com/ar/rss/topgrossingapplications/limit=${limit}/json`, { timeout: 8000 });
  const entries = res.data?.feed?.entry || [];
  return entries.slice(0, limit).map((e, i) => ({
    pos: i + 1,
    name: e['im:name']?.label || 'Unknown',
    detail: e['im:price']?.label || 'Free',
  }));
}

async function fetchTopYouTube(limit = 10) {
  // Use YouTube trending via scraping
  const res = await axios.get('https://www.youtube.com/feed/trending', {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'es-ES,es;q=0.9' },
    timeout: 10000,
  });
  const match = res.data.match(/var ytInitialData = (.+?);<\/script>/s);
  if (!match) throw new Error('No se pudo obtener trending');
  const data = JSON.parse(match[1]);
  const items = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
    ?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]
    ?.shelfRenderer?.content?.expandedShelfContentsRenderer?.items || [];
  return items.slice(0, limit).map((item, i) => {
    const v = item?.videoRenderer;
    return {
      pos: i + 1,
      name: v?.title?.runs?.[0]?.text || 'Unknown',
      detail: v?.ownerText?.runs?.[0]?.text || '',
    };
  });
}

async function fetchTopSpotify(limit = 10) {
  // Spotify global top 50 via public endpoint
  const res = await axios.get('https://charts.spotify.com/charts/view/regional-global-daily/latest', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 10000,
  });
  const match = res.data.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s);
  if (!match) throw new Error('No se pudo obtener Spotify');
  const data = JSON.parse(match[1]);
  const entries = data?.props?.pageProps?.chartData?.chartEntryData || [];
  return entries.slice(0, limit).map((e, i) => ({
    pos: i + 1,
    name: e?.trackMetadata?.trackName || 'Unknown',
    detail: e?.trackMetadata?.artists?.map(a => a.name).join(', ') || '',
  }));
}

async function fetchTopAnime(limit = 10) {
  const res = await axios.get(`https://api.jikan.moe/v4/top/anime?limit=${Math.min(limit, 25)}&filter=airing`, { timeout: 10000 });
  const data = res.data?.data || [];
  return data.slice(0, limit).map((a, i) => ({
    pos: i + 1,
    name: a.title_english || a.title || 'Unknown',
    detail: `⭐ ${a.score || 'N/A'} | ${a.type || ''}`,
  }));
}

async function fetchTopCountries(limit = 10) {
  const res = await axios.get('https://restcountries.com/v3.1/all?fields=name,population', { timeout: 10000 });
  const countries = res.data || [];
  countries.sort((a, b) => (b.population || 0) - (a.population || 0));
  return countries.slice(0, limit).map((c, i) => ({
    pos: i + 1,
    name: c.name?.common || 'Unknown',
    detail: `👥 ${(c.population || 0).toLocaleString('es-AR')}`,
  }));
}

async function fetchTopCrypto(limit = 10) {
  const res = await axios.get(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1`, { timeout: 10000 });
  return res.data.slice(0, limit).map((c, i) => ({
    pos: i + 1,
    name: `${c.name} (${c.symbol?.toUpperCase()})`,
    detail: `$${c.current_price?.toLocaleString('en-US') || '?'} ${c.price_change_percentage_24h >= 0 ? '📈' : '📉'}${Math.abs(c.price_change_percentage_24h || 0).toFixed(1)}%`,
  }));
}

async function fetchTopApps(limit = 10) {
  const res = await axios.get(`https://itunes.apple.com/ar/rss/topfreeapplications/limit=${limit}/json`, { timeout: 8000 });
  const entries = res.data?.feed?.entry || [];
  return entries.slice(0, limit).map((e, i) => ({
    pos: i + 1,
    name: e['im:name']?.label || 'Unknown',
    detail: e['im:price']?.label || 'Gratis',
  }));
}

async function getTop(category, limit = 10) {
  const cat = category?.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const fn = topProviders[cat];
  if (!fn) {
    const available = Object.keys(topProviders).join(', ');
    throw new Error(`Categoría no encontrada. Disponibles: ${available}`);
  }
  const items = await fn(limit);
  return { category: cat, items };
}

function formatTop(category, items) {
  const medals = ['🥇', '🥈', '🥉'];
  const emoji = {
    musica: '🎵', peliculas: '🎬', series: '📺', juegos: '🎮',
    youtube: '▶️', spotify: '🎧', anime: '🌸', paises: '🌍',
    cripto: '💰', apps: '📱',
  };
  const icon = emoji[category] || '🏆';
  let msg = `${icon} *TOP ${items.length} ${category.toUpperCase()}*\n\n`;
  items.forEach((item, i) => {
    const medal = medals[i] || `*${item.pos}.*`;
    msg += `${medal} ${item.name}`;
    if (item.detail) msg += `\n   └ ${item.detail}`;
    msg += '\n';
  });
  return msg;
}

module.exports = { getTop, formatTop, topProviders };
