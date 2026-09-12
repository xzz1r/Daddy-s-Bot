// ─── Salidas a internet con freno: ni la red de casa ni el metadata del VPS ──
//
// El bot baja ficheros de URLs QUE LE DA UN TERCERO. No las escribe nadie del
// grupo: las devuelven las APIs —el enlace del mp3 que manda RapidAPI, el gif
// que manda nekos.best, la imagen que manda Pinterest, la foto de perfil que
// manda WhatsApp— y el bot las pide sin mirar. Eso es exactamente un SSRF: el
// dia que una de esas APIs se ponga a devolver `http://169.254.169.254/...`,
// el bot le pide a Oracle las credenciales de la maquina y las manda al grupo
// como si fueran una cancion.
//
// Y no hace falta que la API sea mala. Basta con que la compren, con que le
// entren, o con que un dominio que ya no renueven lo registre otro.
//
// LO QUE SE MIRA ES LA IP, NO EL NOMBRE. Una lista negra de nombres no sirve
// para nada: `metadata.lo-que-sea.com` puede resolver a 169.254.169.254 sin
// que el nombre lo diga. Asi que lo que se juzga es siempre la direccion a la
// que se iba a conectar de verdad.
//
// Y hacen falta TRES piezas, no una. Empece poniendo solo el freno del
// `lookup` —la traduccion de nombre a IP, justo antes de abrir el socket— y la
// prueba enseño que por ahi se colaba justo el caso mas probable: Node NO llama
// al lookup cuando el destino ya viene escrito como IP (`net.connect` mira
// `net.isIP(host)` y conecta directo), asi que `http://169.254.169.254/...`,
// que es como se escribe el metadata de Oracle, entraba entero.
//
//   · `lookup`         — los NOMBRES, resueltos en el momento de conectar. Ahi
//                        y no en un vistazo previo a la URL, porque asi no hay
//                        dos resoluciones distintas: se comprueba la misma que
//                        se usa, y el DNS no puede contestar una cosa al mirar
//                        y otra al conectar (rebinding).
//   · interceptor      — la IP escrita a pelo en la URL de partida, y el
//                        esquema, que ninguna IP puede mirar.
//   · `beforeRedirect` — la IP escrita a pelo a la que lleva una redireccion.
//                        Una cadena que empieza en un sitio publico y acaba en
//                        127.0.0.1 solo se ve en ese salto.
const dns = require('dns');
const net = require('net');

function aBytesV4(ip) {
  const trozos = String(ip).split('.');
  if (trozos.length !== 4) return null;
  const bytes = [];
  for (const t of trozos) {
    if (!/^\d{1,3}$/.test(t)) return null;
    const n = Number(t);
    if (n > 255) return null;
    bytes.push(n);
  }
  return bytes;
}

// Los rangos que no son "internet". Cada uno esta aqui por un motivo concreto,
// no por copiar una lista.
function v4Prohibida(b) {
  if (!b) return true;                                   // no se entiende: no se va
  const [a, c, d] = b;
  if (a === 0) return true;                              // 0.0.0.0/8, "esta red"
  if (a === 10) return true;                             // privada
  if (a === 127) return true;                            // el propio bot
  if (a === 169 && c === 254) return true;               // enlace local Y EL METADATA DEL VPS
  if (a === 172 && c >= 16 && c <= 31) return true;      // privada
  if (a === 192 && c === 168) return true;               // privada
  if (a === 192 && c === 0 && d === 0) return true;      // 192.0.0/24, asignaciones del protocolo
  if (a === 100 && c >= 64 && c <= 127) return true;     // CGNAT: la red del operador
  if (a === 198 && (c === 18 || c === 19)) return true;  // pruebas de rendimiento
  if (a >= 224) return true;                             // multicast, reservado y broadcast
  return false;
}

function aBytesV6(ip) {
  let s = String(ip);
  const pct = s.indexOf('%');
  if (pct >= 0) s = s.slice(0, pct);                     // %eth0 y demas
  // Cola en formato IPv4: ::ffff:1.2.3.4 y parientes. Se traduce a dos grupos
  // hexadecimales para poder expandir la direccion como cualquier otra.
  const m = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(s);
  if (m) {
    const cola = aBytesV4(m[1]);
    if (!cola) return null;
    const hex = `${((cola[0] << 8) | cola[1]).toString(16)}:${((cola[2] << 8) | cola[3]).toString(16)}`;
    s = s.slice(0, m.index) + hex;
  }
  const mitades = s.split('::');
  if (mitades.length > 2) return null;
  const izq = mitades[0] ? mitades[0].split(':') : [];
  const der = mitades.length === 2 ? (mitades[1] ? mitades[1].split(':') : []) : null;
  let grupos;
  if (der === null) {
    grupos = izq;
  } else {
    const faltan = 8 - izq.length - der.length;
    if (faltan < 0) return null;
    grupos = [...izq, ...Array(faltan).fill('0'), ...der];
  }
  if (grupos.length !== 8) return null;
  const bytes = [];
  for (const g of grupos) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    const n = parseInt(g, 16);
    bytes.push((n >> 8) & 0xff, n & 0xff);
  }
  return bytes;
}

function v6Prohibida(b) {
  if (!b) return true;
  const ceros = (hasta) => b.slice(0, hasta).every((x) => x === 0);
  if (ceros(15) && (b[15] === 0 || b[15] === 1)) return true;          // :: y ::1
  if (ceros(10) && b[10] === 0xff && b[11] === 0xff) return v4Prohibida(b.slice(12)); // ::ffff:v4
  if (ceros(12)) return true;                                          // ::v4, obsoleta
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b) return v4Prohibida(b.slice(12)); // NAT64
  if ((b[0] & 0xfe) === 0xfc) return true;                             // fc00::/7, privada
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true;            // fe80::/10, enlace local
  if (b[0] === 0xff) return true;                                      // multicast
  if (b[0] === 0x20 && b[1] === 0x02) return v4Prohibida(b.slice(2, 6)); // 6to4: el destino va dentro
  return false;
}

// ¿Es una direccion a la que el bot NO debe conectarse? Esta responde SIEMPRE
// lo mismo, pase lo que pase con la puerta de pruebas de aqui abajo: es la
// tabla de rangos y punto.
function ipProhibida(ip) {
  const clase = net.isIP(String(ip));
  if (clase === 4) return v4Prohibida(aBytesV4(ip));
  if (clase === 6) return v6Prohibida(aBytesV6(ip));
  return true;   // ni v4 ni v6: no se sabe a donde va, no se va
}

// ─── LA UNICA PUERTA, Y SOLO PARA LAS PRUEBAS ───────────────────────────────
//
// scripts/check.js levanta servidores de mentira en 127.0.0.1 para medir *!tt*,
// *!ig* y *!pin* de punta a punta sin salir a internet. Con el freno puesto,
// esas pruebas dejan de poder existir — y quedarse sin ellas para tener el
// freno es cambiar un agujero por otro.
//
// Asi que hay una puerta, y esta hecha para que no se pueda abrir sin querer:
//
//   · NO es una variable de entorno. Una variable se queda puesta en el VPS y
//     nadie se entera; esto es una funcion que hay que llamar a proposito.
//   · SOLO ABRE EL LOOPBACK. 127.0.0.1 y ::1, nada mas. 169.254.169.254 —el
//     metadata, que es de lo que va todo esto— sigue cerrado hasta con la
//     puerta abierta, o la capa 61 estaria midiendo el vacio.
//   · Nace cerrada y una capa comprueba que nada de src/ la llama.
let loopbackPermitido = false;
function permitirLoopback(si) { loopbackPermitido = Boolean(si); }

function esLoopback(ip) {
  const clase = net.isIP(String(ip));
  if (clase === 4) { const b = aBytesV4(ip); return Boolean(b) && b[0] === 127; }
  if (clase === 6) {
    const b = aBytesV6(ip);
    if (!b) return false;
    if (b.slice(0, 15).every((x) => x === 0) && b[15] === 1) return true;
    if (b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff) return b[12] === 127;
    return false;
  }
  return false;
}

// La que consultan los frenos de verdad. La de arriba es la tabla; esta es la
// tabla mas la puerta.
function prohibidaAhora(ip) {
  if (loopbackPermitido && esLoopback(ip)) return false;
  return ipProhibida(ip);
}

class DestinoProhibido extends Error {
  constructor(donde) {
    super(`destino no permitido: ${donde}`);
    this.name = 'DestinoProhibido';
    this.prohibido = true;
  }
}

// El `lookup` que se le pasa a axios. Misma firma que dns.lookup, porque quien
// lo llama al final es el propio Node al abrir el socket.
//
// Se pide SIEMPRE `all: true` y se filtra: si un nombre resuelve a una publica
// y a una privada, quedarse con la primera que venga seria dejarlo al azar del
// orden del DNS. Se descartan las prohibidas y se sigue con las que queden.
function lookupSeguro(hostname, opciones, cb) {
  const fin = typeof opciones === 'function' ? opciones : cb;
  const opts = typeof opciones === 'function' ? {} : (opciones || {});
  dns.lookup(hostname, { ...opts, all: true }, (err, direcciones) => {
    if (err) return fin(err);
    const lista = (Array.isArray(direcciones) ? direcciones : [direcciones])
      .filter((d) => d && !prohibidaAhora(d.address));
    if (!lista.length) return fin(new DestinoProhibido(hostname));
    // Devolver siempre una lista vale para los dos casos: axios la reduce solo
    // cuando no se pidio `all`.
    fin(null, lista.map((d) => ({ address: d.address, family: d.family })));
  });
}

const ESQUEMAS = new Set(['http:', 'https:']);

// El otro filtro, el que la IP no puede dar: el esquema. axios en Node tambien
// entiende `data:` y `file:`, asi que una API que devolviera
// `file:///home/ubuntu/Bot-/.env` como enlace de descarga se leeria tal cual.
function urlSegura(url) {
  let u;
  try { u = new URL(String(url)); } catch { return false; }
  return ESQUEMAS.has(u.protocol);
}

// Lo que se mete en cada axios que pida una URL de fuera.
const SEGURO = { lookup: lookupSeguro };

// Envoltorio para el caso normal: comprueba el esquema y añade el lookup.
function pedir(axios, url, config = {}) {
  if (!urlSegura(url)) return Promise.reject(new DestinoProhibido(String(url).slice(0, 60)));
  return axios.get(url, { ...config, lookup: lookupSeguro });
}

// ─── Y SE ARMA SOLO ────────────────────────────────────────────────────────
//
// El freno se pone en `axios.defaults`, no fichero por fichero, y el motivo es
// que asi no se puede olvidar. Hay diecinueve llamadas a axios repartidas por
// el bot y cualquiera que se añada mañana entraria sin freno si esto fuera una
// linea que hay que acordarse de escribir en cada sitio.
//
// axios es un unico objeto compartido por todo el proceso —un require devuelve
// siempre la misma instancia—, asi que basta con cargar este fichero una vez.
// Se carga desde bot.js y ademas desde cada modulo que sale a internet, para
// que los scripts sueltos (npm run enlace y demas) tampoco queden sin el.
//
// mergeConfig de axios deja pasar las claves que no conoce de defaults a la
// peticion, y el adaptador de Node lee `lookup` de ahi (axios.cjs: `own
// ('lookup')`), asi que una peticion que no diga nada hereda el freno y una que
// traiga el suyo manda ella. Es lo que se quiere en los dos casos.
//
// EL `lookup` SOLO NO BASTA, Y ESTO ME LO ENSEÑO LA PRUEBA. Node no llama al
// lookup cuando el destino YA es una IP escrita a pelo: `net.connect` mira
// `net.isIP(host)` y, si lo es, conecta directo sin traducir nada. O sea que
// justo la forma mas probable de este ataque —`http://169.254.169.254/...`, que
// es como se escribe el metadata de Oracle— se colaba entera por el unico
// hueco que dejaba el freno.
//
// Asi que son tres piezas y cada una cubre lo que las otras no pueden:
//
//   · `lookup`          — los NOMBRES, en cada salto y en el momento de
//                         conectar (cierra el rebinding de DNS).
//   · interceptor       — la IP escrita a pelo en la URL de partida, y el
//                         esquema, que ninguna IP puede mirar.
//   · `beforeRedirect`  — la IP escrita a pelo a la que lleva una redireccion,
//                         que es el salto que nadie mira.
function hostProhibido(hostname) {
  const h = String(hostname || '').replace(/^\[|\]$/g, '');   // [::1] de las URLs
  return net.isIP(h) ? prohibidaAhora(h) : false;   // los nombres los juzga el lookup
}

function comprobarSalida(config) {
  let u = null;
  try {
    u = new URL(String(config.url || ''), config.baseURL || undefined);
  } catch {
    return config;   // no se entiende: que siga y que lo juzgue el lookup
  }
  if (!ESQUEMAS.has(u.protocol)) throw new DestinoProhibido(u.protocol);
  if (hostProhibido(u.hostname)) throw new DestinoProhibido(u.hostname);
  return config;
}

function antesDeRedirigir(opciones) {
  const h = opciones?.hostname || opciones?.host;
  if (hostProhibido(h)) throw new DestinoProhibido(String(h));
}

function instalar(cliente) {
  const ax = cliente || require('axios');
  if (!ax || !ax.defaults || ax.defaults.lookup === lookupSeguro) return ax;
  ax.defaults.lookup = lookupSeguro;
  ax.defaults.beforeRedirect = antesDeRedirigir;
  if (ax.interceptors?.request) ax.interceptors.request.use(comprobarSalida);
  return ax;
}
instalar();

module.exports = { ipProhibida, hostProhibido, lookupSeguro, urlSegura, pedir, SEGURO, DestinoProhibido, instalar,
  // Puerta de pruebas. Nada de src/ puede llamarla; lo vigila la capa 61.
  permitirLoopback,
  _aBytesV4: aBytesV4, _aBytesV6: aBytesV6 };
