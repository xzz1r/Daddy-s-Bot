// EL RITMO DEL BOT: que nunca dispare en ráfaga.
//
// Lo pidió el dueño al cambiar de número, porque el anterior se iba a revisión
// cada poco. Una cuenta que contesta diez cosas en el mismo segundo, expulsa a
// tres seguidas o pregunta por cincuenta números en fila no se parece a una
// persona, y eso es lo que WhatsApp mira.
//
// No cambia QUÉ hace el bot, solo CUÁNDO: cada tipo de llamada sale con un
// hueco mínimo desde la anterior del mismo tipo, más un poco de azar para que
// el hueco no sea siempre idéntico (un intervalo exacto también es una firma).
//
// SE ESPACIAN LOS ARRANQUES, NO SE ESPERA A QUE TERMINEN. Si una llamada se
// queda colgada, la siguiente sale igual cuando le toca: una cola que esperase
// a la anterior dejaría al bot mudo detrás de un envío que no vuelve nunca.
//
// El visto y el «en línea» NO pasan por aquí, por decisión del dueño.
'use strict';

// TOPES POR HORA Y POR DÍA (1 nov). El hueco solo espacia: con dos segundos
// entre consulta y consulta caben mil ochocientas en una hora, y eso es lo que
// hizo la medida de precisión del anti-empresa (unas 630 seguidas) con tres
// números que cayeron en revisión entre el 25 y el 30 de octubre. El tope es
// la red de debajo: da igual qué función nueva se escriba mañana, el socket no
// deja pasar más. Quien llama ya trata el error como «no se sabe».
//
// `rodaje`: los topes mientras el número lleva menos de siete días vinculado
// (utils/numeroBot.js). Sustituyen a los normales, no se suman.
const RITMOS = {
  // Mensajes, stickers, borrados y reacciones: todo es sendMessage.
  sendMessage: { hueco: 600, azar: 500, cola: true },
  // Expulsar, ascender, degradar. Sin tope normal (una purga del dueño tiene
  // que poder acabar), pero un número recién vinculado echando a decenas de
  // personas en una hora es justo lo que no debe hacer.
  // El tope cuenta PERSONAS, no peticiones: una sola petición puede llevar
  // diez (`porPersona`).
  groupParticipantsUpdate: { hueco: 2500, azar: 1500, porPersona: true, rodaje: { porHora: 30 } },
  // Aceptar o rechazar solicitudes de entrada.
  groupRequestParticipantsUpdate: { hueco: 3000, azar: 1500, porPersona: true, rodaje: { porHora: 30 } },
  // Preguntar si un número tiene WhatsApp. Es lo más vigilado: consultar
  // números en serie es exactamente lo que hace un programa de spam. 150 al
  // día (dueño, 18 oct): eran 60 y una sola *!purge* grande se los comía.
  onWhatsApp: { hueco: 2000, azar: 1500, porDia: 150, rodaje: { porDia: 50 } },
  // Mirar perfiles ajenos: foto, «info» y si es cuenta de empresa. Una a una
  // está bien; en serie es exactamente lo que hace un raspador.
  profilePictureUrl: { hueco: 1500, azar: 1000, porHora: 60, porDia: 400, rodaje: { porHora: 15, porDia: 100 } },
  fetchStatus: { hueco: 1500, azar: 1000, porHora: 30, porDia: 150, rodaje: { porHora: 8, porDia: 40 } },
  getBusinessProfile: { hueco: 2000, azar: 1500, porHora: 40, porDia: 250, rodaje: { porHora: 10, porDia: 60 } },
  // La metadata de los grupos. Casi siempre sale de la caché; cuando no, que
  // no salgan varias peticiones pegadas.
  groupMetadata: { hueco: 1000, azar: 500 },
  groupFetchAllParticipating: { hueco: 5000, azar: 2000 },
};

// Cada tipo lleva su propio reloj: un borrado no tiene por qué esperar a una
// expulsión, y al revés.
function crearRitmo({ hueco, azar = 0 }, ahora = Date.now, aleatorio = Math.random) {
  let libre = 0;
  return function turno() {
    const t = ahora();
    const sale = Math.max(t, libre);
    libre = sale + hueco + Math.floor(aleatorio() * azar);
    return sale - t;   // cuánto hay que esperar antes de salir
  };
}

const esperar = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

// El tope se cuenta en memoria. Un reinicio lo pone a cero, y está bien: lo
// que se frena es la ráfaga, no una auditoría.
//
// crearTope(porDia) a secas sigue valiendo. Con opciones: `porHora` (ventana
// móvil de una hora) y `limites()`, que devuelve { porHora, porDia } en cada
// llamada para que el rodaje de un número los cambie sin rehacer el socket.
// Tras un «no», `gastar.motivo` dice cuál saltó: 'hora' o 'dia'.
function crearTope(porDia, ahora = Date.now, { porHora = 0, limites = null } = {}) {
  let dia = null;
  let usados = 0;
  const enLaHora = [];
  // `n`: cuántas unidades gasta esta llamada (una expulsión de diez cuenta
  // diez). Si no caben enteras, no sale ninguna.
  function gastar(n = 1) {
    const t = ahora();
    const lim = limites ? limites() : { porHora, porDia };
    const hoy = new Date(t).toISOString().slice(0, 10);
    if (hoy !== dia) { dia = hoy; usados = 0; }
    while (enLaHora.length && t - enLaHora[0] >= 60 * 60 * 1000) enLaHora.shift();
    if (lim.porDia && usados + n > lim.porDia) { gastar.motivo = 'dia'; return false; }
    if (lim.porHora && enLaHora.length + n > lim.porHora) { gastar.motivo = 'hora'; return false; }
    usados += n;
    for (let i = 0; i < n; i++) enLaHora.push(t);
    while (enLaHora.length > 5000) enLaHora.shift();
    gastar.motivo = null;
    return true;
  }
  return gastar;
}

// LA COLA DE SALIDA: EL MISMO RITMO, EN MEJOR ORDEN (5 nov).
//
// El dueño pidió el cuello de botella del bot. Medido: no es la CPU (un mensaje
// normal cuesta 0,2 ms y un comando 3,4 ms); es esta fila. Todo sendMessage
// sale de uno en uno con ~0,85 s de media entre envío y envío: unos 70 por
// minuto para todos los grupos juntos. Y salía por orden de llegada: con doce
// respuestas en cola, un borrado del antilink en otro grupo esperaba 8,8 s, y
// el enlace de spam seguía a la vista todo ese rato.
//
// El hueco NO se acorta: es lo que protege al número (tres cayeron en
// revisión). Lo que cambia es quién sale primero:
//   · los borrados (moderación) pasan delante de todo;
//   · el resto, por turnos entre chats: un grupo con veinte comandos en fila
//     no deja a los demás esperando detrás, y dentro de cada chat se respeta
//     el orden;
//   · y las ediciones, al final: solo las usa el «⏳ sigo con ello…» de
//     utils/progreso.js, que es cosmético. No le quitan el sitio a nadie.
// Se sigue espaciando el arranque, sin esperar a que el envío termine.
//
// Y se apunta cuánto espera cada envío (estadoCola), por horas: `npm run
// estado` lo enseña, y es lo que dice si hace falta tocar el hueco o no.
const HORA = 60 * 60 * 1000;
const LENTO_MS = 5000;
// Las medidas viven en memoria: tras un reinicio empiezan de cero, y la línea
// de `npm run estado` dice desde cuándo mide en vez de llamar «24 h» a diez
// minutos.
const ARRANQUE = Date.now();
let medidas = [];   // [{ h, n, suma, max, lentos, borrados, maxBorrado, fila }]
function apuntarEspera(ms, prioritario, enFila, ahora) {
  const h = Math.floor(ahora / HORA);
  let m = medidas[medidas.length - 1];
  if (!m || m.h !== h) {
    m = { h, n: 0, suma: 0, max: 0, lentos: 0, borrados: 0, maxBorrado: 0, fila: 0 };
    medidas.push(m);
    while (medidas.length > 24) medidas.shift();
  }
  m.n++; m.suma += ms; m.max = Math.max(m.max, ms);
  if (ms >= LENTO_MS) m.lentos++;
  if (prioritario) { m.borrados++; m.maxBorrado = Math.max(m.maxBorrado, ms); }
  m.fila = Math.max(m.fila, enFila);
}
// Lo de las últimas 24 horas, sumado.
function estadoCola(ahora = Date.now()) {
  const desde = Math.floor(ahora / HORA) - 23;
  const r = { ts: ahora, desde: Math.max(ARRANQUE, (desde) * HORA), n: 0, mediaMs: 0, maxMs: 0, lentos: 0, borrados: 0, maxBorradoMs: 0, filaMax: 0, horaPunta: null };
  let suma = 0, punta = -1;
  for (const m of medidas) {
    if (m.h < desde) continue;
    r.n += m.n; suma += m.suma; r.maxMs = Math.max(r.maxMs, m.max); r.lentos += m.lentos;
    r.borrados += m.borrados; r.maxBorradoMs = Math.max(r.maxBorradoMs, m.maxBorrado); r.filaMax = Math.max(r.filaMax, m.fila);
    if (m.n > punta) { punta = m.n; r.horaPunta = { ts: m.h * HORA, n: m.n }; }
  }
  r.mediaMs = r.n ? Math.round(suma / r.n) : 0;
  return r;
}

// La línea de `npm run estado`. `dato` es lo que vuelca el bot en
// data/colaSalida.json cada diez minutos.
const seg = (ms) => `${(ms / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} s`;
function lineaCola(dato, ahora = Date.now()) {
  if (!dato || !dato.ts) return { tipo: 'ok', texto: 'Cola de salida: sin medir todavía (el bot la apunta cada diez minutos)' };
  const min = Math.round((ahora - dato.ts) / 60000);
  const hace = min < 1 ? 'ahora mismo' : min < 120 ? `hace ${min} min` : `hace ${Math.round(min / 60)} h`;
  if (!dato.n) return { tipo: 'ok', texto: `Cola de salida: ningún envío en 24 h · ${hace}` };
  const punta = dato.horaPunta
    ? ` · hora punta: ${dato.horaPunta.n} envíos a las ${new Date(dato.horaPunta.ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })} (NY)`
    : '';
  const horasMedidas = dato.desde ? (dato.ts - dato.desde) / HORA : 24;
  const ventana = horasMedidas >= 23 ? '24 h'
    : horasMedidas >= 1 ? `últimas ${Math.floor(horasMedidas)} h, desde el arranque` : 'menos de una hora, desde el arranque';
  const texto = `Cola de salida (${ventana}): ${dato.n.toLocaleString('es-ES')} envíos, espera media ${seg(dato.mediaMs)}, la peor ${seg(dato.maxMs)}`
    + (dato.lentos ? ` (${dato.lentos} de más de ${seg(LENTO_MS)})` : '')
    + (dato.borrados ? `; borrados de moderación: el peor ${seg(dato.maxBorradoMs)}` : '')
    + `${punta} · ${hace}`;
  if (dato.lentos / dato.n >= 0.05) {
    return {
      tipo: 'aviso', texto,
      arreglo: 'la fila se llena en las horas punta. Opciones: quitar respuestas que no hacen falta, o bajar el hueco de sendMessage en src/utils/ritmo.js sabiendo que sube el riesgo de revisión',
    };
  }
  return { tipo: 'ok', texto };
}

function crearCola({ hueco, azar = 0 }, ahora = Date.now, aleatorio = Math.random) {
  let libre = 0;
  let esperando = 0;
  let temporizador = null;
  // Tres filas (0: borrados, 1: el resto, 2: ediciones), y en cada una un
  // turno por chat. Un Map recuerda el orden de inserción: sacar un chat y
  // volver a meterlo lo manda al final, y eso es el turno rotatorio.
  const filas = [new Map(), new Map(), new Map()];
  function siguiente() {
    for (const fila of filas) {
      for (const [chat, lista] of fila) {
        const item = lista.shift();
        fila.delete(chat);
        if (lista.length) fila.set(chat, lista);
        return item;
      }
    }
    return null;
  }
  function bombear() {
    if (temporizador) return;
    while (esperando) {
      const falta = libre - ahora();
      if (falta > 0) {
        temporizador = setTimeout(() => { temporizador = null; bombear(); }, falta);
        return;
      }
      const item = siguiente();
      esperando--;
      const t = ahora();
      libre = t + hueco + Math.floor(aleatorio() * azar);
      apuntarEspera(t - item.desde, item.prioridad === 0, esperando + 1, t);
      item.salir();
    }
  }
  return function pedirTurno(chat, prioridad = 1) {
    return new Promise((salir) => {
      const fila = filas[prioridad === 0 || prioridad === 2 ? prioridad : 1];
      const clave = String(chat || '');
      if (!fila.has(clave)) fila.set(clave, []);
      fila.get(clave).push({ salir, desde: ahora(), prioridad });
      esperando++;
      bombear();
    });
  };
}

// Un tope alcanzado. `code` es 'TOPE_DIARIO' o 'TOPE_HORA'.
class TopeDiario extends Error {
  constructor(que, limite, motivo = 'dia') {
    super(motivo === 'hora'
      ? `tope por hora de ${que} alcanzado (${limite})`
      : `tope diario de ${que} alcanzado (${limite})`);
    this.code = motivo === 'hora' ? 'TOPE_HORA' : 'TOPE_DIARIO';
    this.limite = limite;
  }
}
const esTope = (e) => e?.code === 'TOPE_DIARIO' || e?.code === 'TOPE_HORA';

// Envuelve los métodos del socket. Se llama una vez por socket nuevo: cada
// reconexión trae un objeto distinto y sin envolver.
//
// `enRodaje` se pregunta en cada llamada (por defecto, utils/numeroBot.js):
// mientras dice que sí, mandan los topes de `rodaje` de cada método.
function ponerRitmo(sock, ritmos = RITMOS, { enRodaje = null } = {}) {
  if (!sock || sock.__conRitmo) return sock;
  const rodaje = enRodaje || (() => require('./numeroBot').enRodaje());
  for (const [metodo, cfg] of Object.entries(ritmos)) {
    const original = sock[metodo];
    if (typeof original !== 'function') continue;
    const turno = cfg.cola ? null : crearRitmo(cfg);
    const cola = cfg.cola ? crearCola(cfg) : null;
    const conTope = cfg.porDia || cfg.porHora || cfg.rodaje;
    const limites = () => {
      if (cfg.rodaje && rodaje()) return { porHora: cfg.rodaje.porHora || 0, porDia: cfg.rodaje.porDia || 0 };
      return { porHora: cfg.porHora || 0, porDia: cfg.porDia || 0 };
    };
    const gastar = conTope ? crearTope(0, Date.now, { limites }) : null;
    sock[metodo] = async function conRitmo(...args) {
      const n = cfg.porPersona && Array.isArray(args[1]) ? Math.max(1, args[1].length) : 1;
      if (gastar && !gastar(n)) {
        const lim = limites();
        throw new TopeDiario(metodo, gastar.motivo === 'hora' ? lim.porHora : lim.porDia, gastar.motivo);
      }
      if (cola) await cola(args[0], args[1] && args[1].delete ? 0 : args[1] && args[1].edit ? 2 : 1);
      else await esperar(turno());
      return original.apply(this, args);
    };
  }
  Object.defineProperty(sock, '__conRitmo', { value: true });
  return sock;
}

module.exports = { ponerRitmo, crearRitmo, crearCola, crearTope, estadoCola, lineaCola, RITMOS, TopeDiario, esTope,
  _olvidarMedidas: () => { medidas = []; } };
