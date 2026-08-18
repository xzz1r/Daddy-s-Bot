const { ROBO_OWNER_RACHA_MAX } = require('./economia');

// EL AMAÑO DEL OWNER, EN UN SOLO SITIO.
//
// Estaba repartido y cada dinamica lo resolvia a su manera. El robo bajo a 0,62
// con techo de racha cuando el owner dijo que cantaba, y el contraataque le
// siguio — pero !duel y !mog se quedaron como estaban: en SIEMPRE GANA, literal
// (`side = 'c'`). Y son los dos peores sitios posibles para un 100 %, porque un
// duelo es cara a cara, va con nombre y apellidos y el que pierde lo cuenta.
//
// Aqui esta la razon de que el contador sea uno y no uno por comando: el grupo
// no separa las dinamicas. Ve una sucesion de veces que al owner le sale bien,
// venga de un robo, de un contraataque, de un atraco, de un duelo o de un mog.
// Contar cada una por su lado dejaria pasar rachas de seis alternando comandos,
// que es exactamente lo que se estaba viendo.
//
// LA RACHA IMPORTA MAS QUE LA TASA. Con 0,74 y sin tope, la racha mas larga en
// 400.000 tiradas simuladas era de cuarenta y seis victorias seguidas. Nadie
// lleva la cuenta de porcentajes; todo el mundo ve al mismo tio ganar seis veces
// sin fallar una.
const racha = new Map();   // grupo -> victorias seguidas

// Vive en memoria y se pierde al reiniciar, y esta bien asi: lo que se corta es
// la racha que el grupo esta VIENDO ahora mismo, no un historial.
function ownerGana(grupo, probabilidad) {
  const seguidas = racha.get(grupo) || 0;
  const gana = seguidas >= ROBO_OWNER_RACHA_MAX ? false : Math.random() < probabilidad;
  if (racha.size >= 500) racha.delete(racha.keys().next().value);
  racha.set(grupo, gana ? seguidas + 1 : 0);
  return gana;
}

// Solo para las pruebas: deja el contador como recien arrancado.
function _reiniciarRacha() { racha.clear(); }

module.exports = { ownerGana, _reiniciarRacha };
