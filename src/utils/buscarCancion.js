'use strict';

// ─── QUÉ VÍDEO DE YOUTUBE ES LA CANCIÓN QUE SE PIDE (!play, 20 nov) ──────────
//
// El dueño, con la captura de «!play hotline bling» → «No encontré esa
// canción», tres veces y con el artista: «¿cómo es posible que falle con una
// canción tan famosa? Corrige el motor de búsqueda: muchas veces es poco
// preciso. Hazlo lo más preciso posible».
//
// La búsqueda cogía el PRIMER `"videoId"` que apareciera en el HTML de
// resultados, sin mirar nada más: ni el título, ni el canal, ni la duración.
// Así que lo que saliera primero en la página —un anuncio, una versión en
// directo, un «slowed + reverb», un vídeo oficial con dos minutos de intro—
// era la canción. Y si la API no podía convertir ESE vídeo, no había otro: el
// grupo leía «no encontré esa canción» de una que estaba la primera en
// YouTube.
//
// Ahora se leen los veinte resultados con sus datos y se puntúan:
//
//   · que salgan las palabras que se han pedido (en el título o en el canal,
//     que en los canales «- Topic» el artista solo está ahí), con erratas;
//   · que el canal sea el del artista (sello de artista oficial, VEVO o
//     «- Topic»), y entre los oficiales, el audio limpio antes que el vídeo;
//   · que dure lo que dura la canción: la duración en la que coinciden la
//     mayoría de resultados delata las intros, las versiones extendidas y los
//     acelerados que no lo dicen en el título;
//   · que no sea una variante que nadie ha pedido (en vivo, cover, remix,
//     slowed, 8D, karaoke, una hora en bucle, reacción…), salvo que se pida;
//   · y, a igualdad, lo más visto y lo que YouTube pone arriba.
//
// Si la API no puede con el mejor, se prueban los siguientes que sean la
// MISMA canción (mismas palabras, sin variantes), nunca otra cualquiera: un
// respaldo que contesta cualquier cosa es peor que ninguno (ver downloader).
//
// Todo lo de aquí es leer y ordenar; no baja nada.

const axios = require('axios');

// ─── TEXTO ────────────────────────────────────────────────────────────────────

// NFKD y no NFD: además de quitar las tildes, pasa a letras normales las
// «𝐒𝐥𝐨𝐰𝐞𝐝 + 𝐑𝐞𝐯𝐞𝐫𝐛» de adorno con que se esconden las variantes en los títulos.
function normalizar(t) {
  return String(t || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`´]/g, '')            // god's → gods
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
const palabras = (t) => normalizar(t).split(' ').filter(Boolean);

// Las que no dicen qué canción es: artículos, «feat», «x» de las colaboraciones…
const VACIAS = new Set([
  'the', 'a', 'an', 'la', 'el', 'los', 'las', 'lo', 'de', 'del', 'y', 'e', 'and', 'en', 'ft', 'feat', 'featuring',
  'con', 'by', 'x', 'vs', 'prod', 'w', 'of', 'to',
]);
// …y lo que la gente añade sin que cambie la canción.
const RELLENO = new Set([
  'official', 'oficial', 'videoclip', 'lyrics', 'lyric', 'letra', 'letras', 'hd', 'hq', '4k', '8k', '1080p',
  '720p', 'completa', 'completo', 'mp3', 'youtube', 'yt', 'visualizer', 'visualizador', 'play',
]);
// Y las que a veces son relleno y a veces el título: «la canción» de J Balvin,
// «Música Ligera», «Original Sin». Si salen en el título suman; si no, no
// restan.
const OPCIONALES = new Set(['video', 'clip', 'audio', 'full', 'cancion', 'song', 'music', 'musica', 'tema', 'original', 'version', 'ver']);

// Las palabras de la consulta que deciden la canción, y las que pueden
// ayudar. Si todo lo pedido es de las segundas («la canción»), mandan ellas.
function palabrasDeConsulta(consulta) {
  const todas = palabras(consulta).filter((p) => !VACIAS.has(p) && !RELLENO.has(p) && (p.length > 1 || /\d/.test(p)));
  const estrictas = todas.filter((p) => !OPCIONALES.has(p));
  const opcionales = todas.filter((p) => OPCIONALES.has(p));
  return estrictas.length ? { estrictas, opcionales } : { estrictas: opcionales, opcionales: [] };
}

// Distancia de edición con tope: más allá de `max` da igual cuánto.
function distancia(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let minFila = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < minFila) minFila = cur[j];
    }
    if (minFila > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

// Cuánto se parece una palabra pedida a alguna del título o el canal: 1 si
// está tal cual, algo menos si está con una errata, cortada («session» y
// «sessions») o metida dentro de otra («eminem» en «EminemMusic»).
function parecido(q, toks) {
  let mejor = 0;
  for (const t of toks) {
    if (t === q) return 1;
    if (q.length >= 3 && t.startsWith(q) && t.length - q.length <= 2) mejor = Math.max(mejor, 0.9);
    else if (q.length >= 4 && t.length >= q.length + 3 && t.includes(q)) mejor = Math.max(mejor, 0.8);
    else if (q.length >= 4 && Math.abs(t.length - q.length) <= 2) {
      const d = distancia(q, t, 2);
      if (d === 1) mejor = Math.max(mejor, 0.85);
      else if (d === 2 && q.length >= 8) mejor = Math.max(mejor, 0.7);
    }
  }
  return mejor;
}

// Qué parte de lo pedido sale en el título o en el canal, de 0 a 1. Se
// prueban también dos palabras juntas en los dos sentidos: «hot line» y
// «hotline», «x 100 to» y «x100to».
function cobertura(pedidas, titulo, canal) {
  if (!pedidas.length) return 1;
  const toks = [...palabras(titulo), ...palabras(canal)];
  const juntas = [];
  for (let i = 0; i + 1 < toks.length; i++) juntas.push(toks[i] + toks[i + 1]);
  const todas = [...toks, ...juntas];
  const puntos = pedidas.map((q) => parecido(q, todas));
  for (let i = 0; i + 1 < pedidas.length; i++) {
    if (puntos[i] < 1 || puntos[i + 1] < 1) {
      if (toks.includes(pedidas[i] + pedidas[i + 1])) { puntos[i] = 1; puntos[i + 1] = 1; }
    }
  }
  return puntos.reduce((s, x) => s + x, 0) / pedidas.length;
}

// ─── LO QUE NO ES LA CANCIÓN TAL CUAL ─────────────────────────────────────────
//
// Se miran en el TÍTULO, no en el canal: «TikTokTunes» o «NJ Beats» no hacen
// variante a lo que suben. Y si la consulta lo pide («goteo remix», «live
// forever»), esa variante deja de restar y pasa a sumar.
const VARIANTES = [
  { tipo: 'lento', castigo: 14, re: /\b(slowed|reverb|daycore|chopped|screwed|ralentizad[ao])\b/ },
  { tipo: 'rapido', castigo: 14, re: /\b(sped up|speed up|spedup|nightcore|acelerad[ao])\b/ },
  { tipo: '8d', castigo: 12, re: /\b(8d|16d|3d audio)\b/ },
  { tipo: 'bajos', castigo: 12, re: /\b(bass boosted|bassboosted|bass boost)\b/ },
  { tipo: 'hz', castigo: 12, re: /\b\d{3} ?hz\b/ },
  { tipo: 'karaoke', castigo: 14, re: /\b(karaoke|instrumental|acapella|a cappella|acappella|sin voz|pista|backing track|vocals only|type beat)\b/ },
  { tipo: 'bucle', castigo: 12, re: /\b(\d+ (hora|horas|hour|hours|hr|hrs)|loop|looped|en bucle|extended|extendida|extendido)\b/ },
  { tipo: 'mezcla', castigo: 12, re: /\b(mix|megamix|enganchados?|mashup|medley|full album|album completo|playlist|compilation|recopilacion|grandes exitos|exitos|greatest hits|best of|top \d+)\b/ },
  { tipo: 'directo', castigo: 9, re: /\b(live|en vivo|en directo|concierto|concert|tiny desk|unplugged|desenchufado|festival|tour|coachella|lollapalooza|halftime|super bowl|superbowl|tonight show|late show|fallon|kimmel|colbert|vmas?|grammys?|premios|awards|mtv)\b/ },
  { tipo: 'version', castigo: 11, re: /\b(cover|covers|homenaje|tribute|tributo|parodia|parody|ai|ia|the voice|la voz|x factor|factor x|audicion|audiciones|audition|blind auditions?)\b/ },
  { tipo: 'remix', castigo: 8, re: /\b(remix|rmx|remezcla|bootleg)\b/ },
  { tipo: 'acustico', castigo: 8, re: /\b(acoustic|acustico|acustica|stripped)\b/ },
  { tipo: 'tutorial', castigo: 14, re: /\b(tutorial|como tocar|how to play|how to sing|acordes|chords|piano|guitar|guitarra|bateria|lesson|leccion)\b/ },
  { tipo: 'reaccion', castigo: 16, re: /\b(reaccion|reaccionando|reacciona|reaction|reacting|reacts?|analisis|analysis|explicacion|explained|significado|meaning|breakdown|entrevista|interview|documental|documentary|behind the scenes|making of|podcast|review|resena|flashmob)\b/ },
  { tipo: 'avance', castigo: 12, re: /\b(teaser|trailer|snippet|preview|adelanto|avance|unreleased|leak|filtrad[ao])\b/ },
  { tipo: 'recorte', castigo: 6, re: /\b(edit|edits|amv|fanmade|fan made|shorts?|tiktok|tik tok|status|best part|clean|censurad[ao]|parte eliminada|solo version|version corta|short version)\b/ },
];
// Subidas de fans con la letra o traducidas: suele ser el mismo audio, pero
// entre una así y la del artista, la del artista.
const RESUBIDA = /\b(letra|letras|lyrics?|traduccion|traducida|traducido|sub|subs|subtitulado|subtitulada|legendado|traducao|espanol|english|romanized)\b/;

function variantesDe(texto) {
  const t = normalizar(texto);
  return VARIANTES.filter((v) => v.re.test(t)).map((v) => v.tipo);
}

// ─── CIFRAS DE LA PÁGINA ──────────────────────────────────────────────────────

// «4:56» → 296; «1:04:16» → 3856. Lo que no es una duración, null.
function leerDuracion(texto) {
  const m = /^\s*(\d+):(\d{2})(?::(\d{2}))?\s*$/.exec(String(texto || ''));
  if (!m) return null;
  return m[3] != null ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : Number(m[1]) * 60 + Number(m[2]);
}

// Las vistas llegan escritas de muchas formas según el idioma y el formato de
// la página: «2.165.316.094 visualizaciones», «2,1 mil millones», «2118 M»,
// «7,3 M», «298 mil», «1.2M views». Solo desempatan, así que basta con el
// orden de magnitud.
function leerVistas(texto) {
  const t = String(texto || '').toLowerCase().replace(/ /g, ' ');
  const m = /(\d[\d.,]*)/.exec(t);
  if (!m) return 0;
  const resto = t.slice(m.index + m[1].length);
  let mult = 1;
  if (/^\s*(mil millones|b\b|bn\b|billion)/.test(resto)) mult = 1e9;
  else if (/^\s*(m\b|mill|million|mln)/.test(resto)) mult = 1e6;
  else if (/^\s*(k\b|mil\b|thousand)/.test(resto)) mult = 1e3;
  const num = m[1].replace(/[.,]$/, '');
  if (mult === 1) return Number(num.replace(/\D/g, '')) || 0;
  const n = /^\d+[.,]\d{1,2}$/.test(num) ? parseFloat(num.replace(',', '.')) : parseFloat(num.replace(/[.,]/g, ''));
  return Number.isFinite(n) ? Math.round(n * mult) : 0;
}

// ─── LA PÁGINA DE RESULTADOS ──────────────────────────────────────────────────
//
// YouTube mete los datos en un JSON dentro de la página, de dos formas según
// la versión que sirva (`var ytInitialData = …;` o un <script
// id="yt-initial-data">), y cada resultado en dos formatos según el
// experimento que le toque a quien pregunta (`videoRenderer` y el nuevo
// `lockupViewModel`). Se leen los cuatro casos. Se cogen SOLO los resultados
// de la lista principal: los anuncios y las estanterías de «otros vieron» no
// son lo que se ha buscado.

function jsonDeLaPagina(html) {
  const s = String(html || '');
  let m = /<script[^>]*id="yt-initial-data"[^>]*>([\s\S]*?)<\/script>/.exec(s);
  if (m) { try { return JSON.parse(m[1]); } catch { /* el otro formato */ } }
  m = /var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/.exec(s);
  if (m) { try { return JSON.parse(m[1]); } catch { return null; } }
  return null;
}

const textoDe = (x) => (x == null ? '' : typeof x === 'string' ? x
  : x.simpleText != null ? String(x.simpleText)
    : Array.isArray(x.runs) ? x.runs.map((r) => r.text || '').join('')
      : x.content != null ? String(x.content) : '');

function deVideoRenderer(v) {
  if (!v || !/^[\w-]{11}$/.test(String(v.videoId || ''))) return null;
  const insignias = (v.ownerBadges || []).map((b) => String(b?.metadataBadgeRenderer?.style || ''));
  const enDirecto = (v.badges || []).some((b) => /LIVE/.test(String(b?.metadataBadgeRenderer?.style || '')))
    || (v.thumbnailOverlays || []).some((o) => /LIVE/.test(String(o?.thumbnailOverlayTimeStatusRenderer?.style || '')));
  return {
    id: v.videoId,
    titulo: textoDe(v.title),
    canal: textoDe(v.ownerText) || textoDe(v.longBylineText) || textoDe(v.shortBylineText),
    segundos: leerDuracion(textoDe(v.lengthText)),
    vistas: leerVistas(textoDe(v.viewCountText)),
    artista: insignias.some((s) => /VERIFIED_ARTIST/.test(s)),
    verificado: insignias.some((s) => /VERIFIED/.test(s)),
    enDirecto,
  };
}

function deLockup(l) {
  if (!l || !/VIDEO/.test(String(l.contentType || '')) || !/^[\w-]{11}$/.test(String(l.contentId || ''))) return null;
  const md = l.metadata?.lockupMetadataViewModel || {};
  const filas = md.metadata?.contentMetadataViewModel?.metadataRows || [];
  const canales = [];
  let artista = false, verificado = false, vistas = 0;
  for (const fila of filas) {
    for (const p of fila.metadataParts || []) {
      const etiqueta = String(p.accessibilityLabel || '');
      const texto = textoDe(p.text) || textoDe(p.avatarStack?.avatarStackViewModel?.text);
      if (/visualizaci|views|vistas|reproducci/i.test(etiqueta)) { vistas = leerVistas(etiqueta) || leerVistas(texto); continue; }
      if (fila === filas[0] && texto && !vistas && !/^hace |ago$/i.test(texto)) {
        canales.push(texto.replace(/^y\s+/, ''));
        const icono = p.icon || {};
        if (/AUDIO_BADGE/.test(String(icono.name || '')) || /oficial de artista|official artist/i.test(String(icono.accessibilityLabel || ''))) { artista = true; verificado = true; }
        else if (/CHECK/.test(String(icono.name || '')) || /verific/i.test(String(icono.accessibilityLabel || ''))) verificado = true;
      }
    }
  }
  let segundos = null, enDirecto = false;
  (function mirar(o) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(mirar); return; }
    const b = o.thumbnailBadgeViewModel;
    if (b) {
      const s = leerDuracion(b.text);
      if (s != null && segundos == null) segundos = s;
      if (/LIVE/.test(String(b.badgeStyle || '')) || /^(en directo|live|en vivo)$/i.test(String(b.text || '').trim())) enDirecto = true;
    }
    for (const v of Object.values(o)) mirar(v);
  })(l.contentImage);
  return { id: l.contentId, titulo: textoDe(md.title), canal: canales.join(', '), segundos, vistas, artista, verificado, enDirecto };
}

// Los resultados en el orden de la página, sin anuncios ni estanterías.
function leerResultados(html) {
  const datos = jsonDeLaPagina(html);
  if (!datos) return [];
  let secciones = datos.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
  const items = [];
  if (Array.isArray(secciones)) {
    for (const s of secciones) for (const it of s?.itemSectionRenderer?.contents || []) items.push(it);
  } else {
    // Si YouTube cambia el camino, se buscan los resultados donde estén, pero
    // sin entrar en los anuncios.
    secciones = [];
    (function buscar(o) {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) { o.forEach(buscar); return; }
      for (const [k, v] of Object.entries(o)) {
        if (/^(adSlotRenderer|promoted\w*|searchPyvRenderer|movieRenderer)$/.test(k)) continue;
        if (k === 'videoRenderer' || k === 'lockupViewModel') items.push({ [k]: v });
        else buscar(v);
      }
    })(datos.contents);
  }
  const vistos = new Set();
  const lista = [];
  for (const it of items) {
    const c = it.videoRenderer ? deVideoRenderer(it.videoRenderer) : it.lockupViewModel ? deLockup(it.lockupViewModel) : null;
    if (!c || vistos.has(c.id)) continue;
    vistos.add(c.id);
    lista.push({ ...c, pos: lista.length });
  }
  return lista;
}

// Lo mismo, de la salida de yt-dlp (`--print` con ARGS_YTDLP): el colchón
// cuando la página no se puede leer.
const CAMPOS_YTDLP = '%(id)s\t%(title)s\t%(channel)s\t%(duration)s\t%(view_count)s\t%(channel_is_verified)s\t%(live_status)s';
function leerSalidaYtDlp(texto) {
  const lista = [];
  for (const linea of String(texto || '').split('\n')) {
    const [id, titulo, canal, dur, vistas, verif, directo] = linea.split('\t');
    if (!/^[\w-]{11}$/.test(String(id || '').trim())) continue;
    lista.push({
      id: id.trim(),
      titulo: titulo || '',
      canal: canal && canal !== 'NA' ? canal : '',
      segundos: Number.isFinite(Number(dur)) && Number(dur) > 0 ? Math.round(Number(dur)) : null,
      vistas: Number(vistas) || 0,
      artista: false,
      verificado: String(verif).trim() === 'True',
      enDirecto: /is_live|is_upcoming/.test(String(directo || '')),
      pos: lista.length,
    });
  }
  return lista;
}

// ─── LA PUNTUACIÓN ────────────────────────────────────────────────────────────

const MIN_SEGUNDOS = 45;            // por debajo, la API lo da por recorte (downloader)
const MAX_SEGUNDOS = 17 * 60;       // por encima no cabe en 16 MB como audio
const AUDIO_LIMPIO = /\b(official audio|audio oficial|audio|visualizer|visualizador|lyric video|video lyric|letra oficial|official lyric)\b/;
const TITULO_OFICIAL = /\b(official|oficial)\b/;

function canalOficial(c) {
  const canal = String(c.canal || '');
  const topic = /[-–]\s*(topic|tema)\s*$/i.test(canal);
  const vevo = /vevo\s*$/i.test(canal.replace(/,.*$/, ''));
  return { topic, oficial: Boolean(c.artista || topic || vevo) };
}

// ─── QUÉ RESULTADOS SON LA MISMA CANCIÓN ──────────────────────────────────────
//
// Con «god's plan» salen trece subidas de la de Drake y una de otro artista
// que se llama igual; con «perro negro», la de Bad Bunny y Feid y la ranchera
// de José Alfredo Jiménez. Las palabras que NO son las pedidas —el artista, el
// disco— dicen de cuál es cada una: los resultados que comparten alguna son la
// misma canción, y la que más vistas suma entre todas sus subidas es la que se
// busca. Una canción del mismo nombre, con un vídeo y pocas vistas, no le gana
// a la que el mundo entero ha subido veinte veces.
//
// Del canal solo cuentan los oficiales, que ahí el canal ES el artista: el de
// quien sube letras («7clouds», «Latin City») sube de todo y juntaría
// canciones distintas.
const NO_AGRUPAN = new Set([
  'por', 'para', 'que', 'una', 'uno', 'you', 'your', 'with', 'from', 'sin', 'mas', 'muy', 'esta', 'este', 'pero',
  'como', 'cuando', 'todo', 'todos', 'for', 'but', 'not', 'are', 'was', 'new', 'nuevo', 'nueva', 'topic', 'tema',
  'vevo', 'records', 'record', 'tv', 'channel', 'canal', 'oficial', 'official', 'lyrics', 'lyric', 'letra',
  'letras', 'sub', 'subs', 'espanol', 'english', 'traduccion', 'traducida', 'remix', 'live', 'cover', 'slowed',
  'reverb', 'sped', 'speed', 'hour', 'hours', 'hora', 'horas', 'loop', 'karaoke', 'instrumental', 'clean',
  'edit', 'version', 'vivo', 'directo', 'remastered', 'remasterizado', 'remaster', 'explicit', 'visualizer',
]);
function palabrasDeGrupo(c, pedidas, oficial) {
  const fuentes = [...palabras(c.titulo), ...(oficial ? palabras(c.canal) : [])];
  const fuera = new Set();
  for (const t of fuentes) {
    if (t.length < 3 || /^\d+$/.test(t) || VACIAS.has(t) || RELLENO.has(t) || OPCIONALES.has(t) || NO_AGRUPAN.has(t)) continue;
    // Lo pedido, también metido en otra palabra («BillieEilishVEVO»).
    if (pedidas.some((q) => parecido(q, [t]) >= 0.8 || parecido(t, [q]) >= 0.85)) continue;
    fuera.add(t);
  }
  return fuera;
}

function agrupar(datos, pedidas) {
  const padre = datos.map((_, i) => i);
  const raiz = (i) => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
  // Solo entran los que encajan del todo con lo pedido, también con las
  // palabras opcionales («la canción j balvin»: «Mi Gente» encaja con
  // «balvin» pero no es LA canción), y sin variantes que nadie ha pedido: un
  // «slowed» con muchas vistas no decide cuál es la canción.
  const maxOpc = Math.max(0, ...datos.filter((d) => d.encaja).map((d) => d.opc));
  const entra = (d) => d.encaja && d.opc >= maxOpc && !d.sinPedir.length;
  const cuantas = new Map();   // palabra -> en cuántos resultados sale
  datos.forEach((d) => {
    d.propias = entra(d) ? palabrasDeGrupo(d.c, pedidas, d.oficial) : new Set();
    for (const t of d.propias) cuantas.set(t, (cuantas.get(t) || 0) + 1);
  });
  // Juntan las palabras que se repiten. Las que salen una sola vez no unen a
  // nadie, pero dicen que ese resultado es de alguien más («LLEFLIGHT -
  // GOD'S PLAN»): se queda en un grupo suyo y compite con sus vistas.
  const porPalabra = new Map();
  datos.forEach((d, i) => {
    d.sueltas = [...d.propias].filter((t) => cuantas.get(t) === 1).length;
    for (const t of d.propias) {
      if (cuantas.get(t) < 2) continue;
      if (porPalabra.has(t)) padre[raiz(i)] = raiz(porPalabra.get(t));
      else porPalabra.set(t, i);
    }
  });
  const grupos = new Map();
  datos.forEach((d, i) => {
    // Sin ninguna palabra propia («Duki - Goteo» cuando se ha pedido «goteo
    // duki») no dice de quién es: no hace grupo, y se queda con el que gane.
    if (!entra(d) || !d.propias.size) { d.grupo = null; return; }
    const g = raiz(i);
    d.grupo = g;
    const s = grupos.get(g) || { vistas: 0, max: 0 };
    s.vistas += d.c.vistas || 0;
    s.max = Math.max(s.max, d.c.vistas || 0);
    grupos.set(g, s);
  });
  let dominante = null;
  for (const [g, s] of grupos) if (dominante === null || s.vistas > grupos.get(dominante).vistas) dominante = g;
  for (const d of datos) if (d.grupo === null && entra(d) && dominante !== null) d.grupo = dominante;
  return { grupos, dominante };
}

// LA DURACIÓN DE VERDAD es aquella en la que coinciden más subidas de la
// canción tal cual. Ni la media ni la mediana: con «god's plan», cinco
// resubidas del vídeo de seis minutos arrastraban la mediana lejos de los
// 3:19 en los que coinciden las demás. Se cuenta cuántas caen a cuatro
// segundos de cada una y gana la que más vecinas tiene.
function duracionDeVerdad(segundos) {
  let mejor = null;
  for (const s of segundos) {
    const vecinas = segundos.filter((x) => Math.abs(x - s) <= 4);
    if (vecinas.length < 2) continue;
    if (!mejor || vecinas.length > mejor.n) {
      const orden = [...vecinas].sort((a, b) => a - b);
      mejor = { n: vecinas.length, s: orden[Math.floor(orden.length / 2)] };
    }
  }
  return mejor ? mejor.s : null;
}

// Ordena los candidatos de mejor a peor para la consulta. Cada uno sale con
// `puntos`, `cobertura` y `variantes`, y con `motivos` para el log.
function ordenar(consulta, candidatos) {
  const { estrictas: pedidas, opcionales } = palabrasDeConsulta(consulta);
  // La frase entera, con sus artículos: «la bachata» está en «La Bachata -
  // Manuel Turizo» y no en «Bailando Bachata».
  const frase = palabras(consulta).filter((p) => !RELLENO.has(p)).join(' ');
  const pideVariantes = new Set(variantesDe(consulta));
  const pideLargo = pideVariantes.has('bucle') || pideVariantes.has('mezcla');

  const vivos = (candidatos || []).filter((c) => c && c.id && !c.enDirecto);
  const datos = vivos.map((c) => {
    const variantes = variantesDe(c.titulo);
    const { topic, oficial } = canalOficial(c);
    const toks = [...palabras(c.titulo), ...palabras(c.canal)];
    const faltan = pedidas.filter((q) => parecido(q, toks) === 0 && !toks.some((t, i) => t + (toks[i + 1] || '') === q)).length;
    const opc = opcionales.filter((q) => parecido(q, toks) >= 0.85).length;
    return { c, cob: cobertura(pedidas, c.titulo, c.canal), opc, faltan, variantes, sinPedir: variantes.filter((v) => !pideVariantes.has(v)), topic, oficial };
  });

  // «Encajar» es relativo al que más encaja: con una palabra de más que no
  // está en ningún título («hotline bling porfa») ninguno llega al 100 %, y la
  // canción sigue siendo la misma.
  const alto = Math.max(0, ...datos.map((d) => d.cob));
  for (const d of datos) d.encaja = d.cob >= Math.max(0.5, alto - 0.15);
  const { grupos, dominante } = agrupar(datos, [...pedidas, ...opcionales]);
  const buenos = (d) => !d.sinPedir.length && d.c.segundos >= 60 && d.c.segundos <= 900;
  const deLaCancion = datos.filter((d) => d.grupo != null && d.grupo === dominante && buenos(d));
  const duracion = duracionDeVerdad(deLaCancion.map((d) => d.c.segundos));
  // Las vistas, contra las de la subida más vista de su misma canción: lo que
  // separan es la del artista de las resubidas.
  const maxGlobal = Math.max(0, ...datos.filter((d) => d.encaja).map((d) => d.c.vistas || 0));

  const puntuados = datos.map(({ c, cob, opc, faltan, variantes, sinPedir, topic, oficial, grupo, sueltas }) => {
    const motivos = [];
    // Lo que se ha pedido manda sobre todo lo demás, y una palabra que no está
    // en ninguna parte es casi seguro otra canción («monaco bad bunny» no es
    // «Moscow Mule» de Bad Bunny, por muy vista que esté).
    let p = 24 * cob - 10 * faltan + Math.min(4, 2 * opc);
    if (faltan) motivos.push(`faltan ${faltan}`);
    const titulo = normalizar(c.titulo);
    if (frase.includes(' ') && (` ${titulo} `).includes(` ${frase} `)) { p += 2; motivos.push('frase'); }

    if (oficial) { p += 6; motivos.push(topic ? 'topic' : 'artista'); }
    else if (c.verificado) { p += 2.5; motivos.push('verificado'); }
    if (TITULO_OFICIAL.test(titulo)) p += oficial ? 1.5 : 0.5;
    // Entre lo del artista, el audio limpio: sin intro ni escenas.
    if (oficial && (topic || AUDIO_LIMPIO.test(titulo))) { p += 2; motivos.push('audio'); }
    if (!oficial && RESUBIDA.test(titulo)) p -= 1.5;
    // Palabras que no salen en ningún otro resultado («Lionel Messi ● un
    // x100to»): una subida de fan con algo encima, no la canción a pelo.
    if (!oficial && sueltas) p -= Math.min(3, 0.8 * sueltas);

    // Otra canción que se llama igual, con muchas menos vistas entre todas sus
    // subidas que la que se busca.
    if (grupo != null && dominante != null && grupo !== dominante) {
      const ratio = (grupos.get(dominante).vistas + 1) / (grupos.get(grupo).vistas + 1);
      const castigo = Math.min(12, 3.5 * Math.log10(ratio));
      if (castigo > 0.5) { p -= castigo; motivos.push('otra canción'); }
    }
    const tope = grupo != null ? grupos.get(grupo).max : maxGlobal;
    if (tope > 0) {
      const rel = Math.max(0, Math.log10(tope + 1) - Math.log10((c.vistas || 0) + 1));
      p -= Math.min(5, 1.2 * rel);
    }
    p += 3 * Math.max(0, 1 - (c.pos || 0) / 10);

    let castigo = 0;
    for (const v of sinPedir) castigo += VARIANTES.find((x) => x.tipo === v).castigo;
    if (castigo) { p -= Math.min(22, castigo); motivos.push(`variante:${sinPedir.join('+')}`); }
    for (const v of pideVariantes) {
      if (variantes.includes(v)) p += 3;
      else p -= 4;
    }

    const s = c.segundos;
    if (s != null) {
      if (s < MIN_SEGUNDOS || s > MAX_SEGUNDOS) { p -= 30; motivos.push('no cabe'); }
      else if (s < 90) { p -= 8; motivos.push('corto'); }
      else if (s > 600 && !pideLargo) { p -= 8; motivos.push('largo'); }
      if (duracion && s >= MIN_SEGUNDOS && s <= MAX_SEGUNDOS && !pideLargo) {
        const dif = Math.abs(s - duracion);
        const ratio = dif / duracion;
        if (dif > 20 && ratio > 0.12) { p -= Math.min(10, 4 + 15 * (ratio - 0.12)); motivos.push(`dura ${s}s y la canción ${Math.round(duracion)}s`); }
      }
    }
    return { ...c, puntos: Math.round(p * 100) / 100, cobertura: Math.round(cob * 100) / 100, variantes, sinPedir, motivos, grupo, duracionCancion: duracion };
  });

  return puntuados.sort((a, b) => b.puntos - a.puntos || a.pos - b.pos);
}

// Los que vale la pena probar, en orden: el mejor, y detrás solo los que son
// la MISMA canción —del mismo grupo, con las mismas palabras, sin variantes
// que no se han pedido, de la misma duración y sin quedarse muy atrás—. Así,
// si la API no puede con el vídeo del artista, se prueba la misma canción
// subida por otro, y nunca otra cualquiera.
const MAX_INTENTOS = 3;
function aProbar(ordenados, max = MAX_INTENTOS) {
  if (!ordenados.length) return [];
  const mejor = ordenados[0];
  const cerca = (s, ref) => ref == null || Math.abs(s - ref) <= Math.max(25, 0.15 * ref);
  const resto = ordenados.slice(1).filter((c) => c.cobertura >= mejor.cobertura - 0.01
    && (mejor.grupo == null || c.grupo === mejor.grupo)
    && !c.sinPedir.length && c.puntos >= mejor.puntos - 14
    && c.segundos != null && c.segundos >= MIN_SEGUNDOS && c.segundos <= MAX_SEGUNDOS
    && (cerca(c.segundos, mejor.duracionCancion) || cerca(c.segundos, mejor.segundos)));
  return [mejor, ...resto].slice(0, max);
}

// ─── LA BÚSQUEDA EN YOUTUBE ───────────────────────────────────────────────────
//
// La página de resultados, filtrada a vídeos (`sp`). Es una página web normal,
// no la API de extracción que sufre el bot-check del datacenter. La cookie de
// consentimiento evita que desde una IP europea YouTube conteste con su aviso
// en vez de con los resultados.
async function buscarEnYouTube(consulta, { timeout = 8000 } = {}) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(consulta)}&sp=EgIQAQ%253D%253D`;
  const res = await axios.get(url, {
    timeout,
    responseType: 'text',
    maxContentLength: 8 * 1024 * 1024,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'es',
      Cookie: 'SOCS=CAI; CONSENT=YES+',
    },
  });
  const html = String(res.data || '');
  return { lista: leerResultados(html), html };
}

// El enlace pegado tal cual (también de YouTube Music y los Shorts).
function idDeEnlace(texto) {
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(String(texto || ''));
  return m ? m[1] : null;
}

// Una línea para el log: qué se eligió y por qué.
function resumen(c) {
  if (!c) return '';
  const min = c.segundos != null ? `${Math.floor(c.segundos / 60)}:${String(c.segundos % 60).padStart(2, '0')}` : '?';
  return `«${String(c.titulo || c.id).slice(0, 60)}» de ${String(c.canal || '?').slice(0, 30)} (${min}, ${c.puntos ?? '?'} pts${c.motivos?.length ? `: ${c.motivos.join(', ')}` : ''})`;
}

module.exports = {
  ordenar, aProbar, buscarEnYouTube, leerResultados, leerSalidaYtDlp, idDeEnlace, resumen,
  CAMPOS_YTDLP, MAX_INTENTOS, MIN_SEGUNDOS, MAX_SEGUNDOS,
  _normalizar: normalizar, _palabrasDeConsulta: palabrasDeConsulta, _cobertura: cobertura,
  _leerVistas: leerVistas, _leerDuracion: leerDuracion, _variantesDe: variantesDe,
};
