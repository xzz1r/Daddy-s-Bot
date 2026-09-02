// Los ultimos mensajes que ha mandado el bot, para poder reenviarlos.
//
// EXISTE POR UNA RESPUESTA QUE NUNCA LLEGA. Cuando el telefono de alguien no
// consigue descifrar un mensaje nuestro, WhatsApp NO lo da por perdido: pide el
// mensaje otra vez, y Baileys resuelve esa peticion llamando a `getMessage`. El
// bot devolvia `undefined` siempre, asi que no habia reintento posible: esa
// persona se quedaba sin la respuesta y en el grupo se lee como que el bot pasa
// de uno en concreto.
//
// No es un historial ni un store de sesion: son los ultimos N mensajes propios,
// en memoria, y se pierden al reiniciar. Un reintento llega en segundos; lo que
// se pida despues de un reinicio ya no le importa a nadie.
//
// Se guarda SOLO lo que manda el bot (`key.fromMe`). Guardar lo que llega seria
// quedarse una copia de la conversacion del grupo en RAM sin ninguna necesidad,
// y este bot no almacena mensajes ajenos.
const TOPE = 300;

const cache = new Map();   // id del mensaje -> contenido

function recordar(key, message) {
  if (!key?.fromMe || !key.id || !message) return;
  // LRU: reinsertar no reordena en un Map, hay que borrar y volver a poner.
  if (cache.has(key.id)) cache.delete(key.id);
  else if (cache.size >= TOPE) cache.delete(cache.keys().next().value);
  cache.set(key.id, message);
}

// La firma que espera Baileys. Si no lo tenemos, `undefined` es la respuesta
// correcta: significa "no puedo reenviarlo", que es exactamente donde estabamos
// antes para todo.
async function recuperar(key) {
  return (key?.id && cache.get(key.id)) || undefined;
}

function cuantos() { return cache.size; }

module.exports = { recordar, recuperar, cuantos, TOPE };
