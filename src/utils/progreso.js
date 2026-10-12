// «SIGO CON ELLO», PARA LO QUE TARDA.
//
// El dueño (12 oct), con un *!tt* de 1:57: «no sé siquiera si funciona o si se
// quedó congelado». Y tenia razon en no saberlo. El bot borra el enlace en
// cuanto cobra, enciende el «escribiendo…» UNA vez —WhatsApp lo apaga solo a
// los pocos segundos— y despues no dice nada hasta que llega el video. Un bot
// que trabaja dos minutos en silencio no se distingue de uno colgado, y la
// gente lo repite, que cuesta aura otra vez y pone otra descarga en la cola.
//
// Dos cosas, y ninguna molesta si el comando va rapido:
//
//   · El «escribiendo…» se renueva mientras dura el trabajo, no solo al
//     empezar. Va atado al mismo interruptor que el visto (*!visto*).
//   · Si pasan AVISO_TRAS_MS sin terminar, sale UN mensaje que dice que esta en
//     marcha, en que fase va y cuanto lleva. Se edita en el sitio —no salen
//     mensajes nuevos— y se borra en cuanto el comando acaba, bien o mal. Lo
//     normal (un TikTok corto, un sticker) acaba antes y no lo ve nadie.
//
// Cada comando dice su texto en su fila de comandos.js (`espera`). El que sabe
// en que fase va —bajando, ajustando, subiendo— lo cuenta con `etapa`.

const AVISO_TRAS_MS = 6000;
// CON UN POCO DE AZAR, por lo mismo que utils/ritmo.js: un mensaje editado cada
// diez segundos clavados es una firma de programa, y el numero ya estuvo en
// revision una vez. Entre 15 y 20 s; el contador avanza igual.
const CADA_MS = 15000;
const AZAR_MS = 5000;
// WhatsApp deja de enseñar el «escribiendo…» a los diez o quince segundos si no
// se renueva. Las apps lo renuevan cada pocos segundos mientras alguien escribe.
const PRESENCIA_CADA_MS = 8000;
// Lo que se espera al acabar a que salga un aviso que estaba en camino.
const ESPERA_FINAL_MS = 10000;

const activos = new Map();   // id del mensaje del comando -> seguimiento

function textoDe(s) {
  const lleva = Math.max(1, Math.round((Date.now() - s.t0) / 1000));
  const queda = s.terminaHacia ? Math.round((s.terminaHacia - Date.now()) / 1000) : 0;
  return `⏳ ${s.etapa}…\n`
    + `_Lleva ${lleva} s${queda >= 5 ? `; quedan unos ${queda} s` : ''}. `
    + 'Ya está en marcha: no hace falta pedirlo otra vez._';
}

// Todo lo que toca el mensaje va en fila: un editado no puede adelantar al
// envio, ni el borrado a un editado.
function enFila(s, hacer) {
  s.fila = s.fila.then(hacer).catch(() => {});
  return s.fila;
}

function mostrar(s) {
  if (s.acabado || s.clave || s.mostrando) return;
  s.mostrando = true;
  enFila(s, async () => {
    if (s.acabado) return;
    const enviado = await s.sock.sendMessage(s.jid, { text: textoDe(s) }, { quoted: s.msg });
    s.clave = enviado?.key || null;
  });
  const siguiente = () => {
    s.reloj = setTimeout(() => { actualizar(s); siguiente(); }, s.cada + Math.floor(Math.random() * s.azar));
    s.reloj.unref?.();
  };
  siguiente();
}

// Se pone en la fila aunque el aviso aun no tenga clave: si esta saliendo, la
// fila hace que el editado vaya detras y ya la encuentre.
function actualizar(s) {
  if (s.acabado || !s.mostrando) return;
  enFila(s, async () => {
    if (s.acabado || !s.clave) return;
    await s.sock.sendMessage(s.jid, { text: textoDe(s), edit: s.clave });
  });
}

// `texto` es lo que sale en el aviso («Bajando el vídeo de TikTok»). Sin texto
// solo se renueva el «escribiendo…».
// Los tiempos se pueden pasar para las pruebas; en marcha valen los de arriba.
function empezar(sock, msg, {
  texto = null, presencia = false,
  tras = AVISO_TRAS_MS, cada = CADA_MS, azar = AZAR_MS, latido = PRESENCIA_CADA_MS,
} = {}) {
  const id = msg?.key?.id;
  const jid = msg?.key?.remoteJid;
  if (!id || !jid || activos.has(id)) return null;
  const s = { sock, msg, jid, etapa: texto, t0: Date.now(), terminaHacia: null, tras, cada, azar,
    clave: null, mostrando: false, acabado: false, fila: Promise.resolve(), espera: null, reloj: null, latido: null };
  if (presencia) {
    s.latido = setInterval(() => { sock.sendPresenceUpdate('composing', jid).catch(() => {}); }, latido);
    s.latido.unref?.();
  }
  if (texto) {
    s.espera = setTimeout(() => mostrar(s), tras);
    s.espera.unref?.();
  }
  activos.set(id, s);
  return s;
}

// La fase cambia: «Ajustando el vídeo…», «Subiéndolo…». Con `segundos`, lo que
// se calcula que va a tardar: si es largo, el aviso sale YA, sin esperar a los
// seis segundos — quien espera dos minutos tiene que saberlo al principio.
function etapa(msg, texto, segundos = null) {
  const s = activos.get(msg?.key?.id);
  if (!s || s.acabado || !s.etapa || !texto) return;
  s.etapa = texto;
  s.terminaHacia = segundos > 0 ? Date.now() + segundos * 1000 : null;
  if (s.mostrando) actualizar(s);
  else if (segundos > 0 && segundos * 1000 > s.tras) mostrar(s);
}

// Se acaba bien o mal: se paran los relojes y el aviso, si salio, se borra.
async function terminar(msg) {
  const id = msg?.key?.id;
  const s = activos.get(id);
  if (!s) return;
  activos.delete(id);
  s.acabado = true;
  clearTimeout(s.espera);
  clearTimeout(s.reloj);
  clearInterval(s.latido);
  // Se espera a lo que estuviera en camino: si el aviso salia justo ahora, hay
  // que tener su clave para poder borrarlo. Pero no para siempre: un envio
  // colgado no puede colgar tambien el final del comando. Si sale tarde, se
  // borra cuando salga.
  const borrar = () => { if (s.clave) s.sock.sendMessage(s.jid, { delete: s.clave }).catch(() => {}); };
  let aTiempo = false;
  await Promise.race([
    s.fila.then(() => { aTiempo = true; }),
    new Promise((r) => { const t = setTimeout(r, ESPERA_FINAL_MS); t.unref?.(); }),
  ]);
  if (aTiempo) borrar();
  else s.fila.then(borrar);
}

module.exports = { empezar, etapa, terminar, AVISO_TRAS_MS, CADA_MS, AZAR_MS, PRESENCIA_CADA_MS, _activos: activos };
