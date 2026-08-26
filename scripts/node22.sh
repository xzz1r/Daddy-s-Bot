#!/usr/bin/env bash
# Sube la VPS de Node 20 a Node 22, o la devuelve a 20 si algo sale mal.
#
#   npm run node22            → sube
#   npm run node22 -- --volver → vuelve a Node 20
#
# POR QUE HACE FALTA. Node 20 salio de soporte: ya no recibe parches de
# seguridad. Node 22 ademas es sensiblemente mas rapido en lo que este bot mas
# hace (JSON, expresiones regulares, promesas).
#
# POR QUE ES UN SCRIPT Y NO CUATRO ORDENES A MANO. Cambiar de Node no es solo
# instalar Node: pm2 esta instalado con el Node viejo y hay que reinstalarlo, y
# las dependencias con binario nativo hay que recompilarlas. Saltarse cualquiera
# de esos dos pasos deja el bot caido de una forma que no dice por que.
#
# EL ORDEN IMPORTA Y ES EL DE AQUI: copia de datos primero, luego Node, luego
# dependencias, luego COMPROBAR, y solo entonces reiniciar. Si la comprobacion
# falla no se reinicia nada: el bot sigue corriendo con lo de antes.
set -euo pipefail

main() {
cd "$(dirname "$0")/.."

VOLVER=0
for a in "$@"; do [ "$a" = "--volver" ] && VOLVER=1; done
DESTINO=22
[ "$VOLVER" = "1" ] && DESTINO=20

ACTUAL="$(node -v 2>/dev/null || echo 'ninguno')"
MAYOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"

echo "════════════════════════════════════════════"
echo "  Node ahora: ${ACTUAL}   →   destino: v${DESTINO}.x"
echo "════════════════════════════════════════════"

# NO SE SALE AUNQUE NODE YA ESTE EN EL DESTINO, y esto es importante.
#
# La primera version salia aqui con un "ya estas en Node 22". El problema: si
# apt terminaba y el script moria despues —por lo que sea—, volver a lanzarlo
# se saltaba pm2 y las dependencias y daba el trabajo por hecho. Node nuevo con
# pm2 viejo y binarios nativos del ABI anterior es exactamente un bot caido, y
# encima con el script diciendo que todo estaba bien.
#
# Asi que se sigue siempre. Reinstalar pm2 y rehacer node_modules cuando ya
# estaban bien no rompe nada y cuesta un minuto; darlos por hechos cuando no lo
# estaban cuesta el bot. El unico paso que se salta es la instalacion de Node,
# que si es idempotente de verdad.
if [ "${MAYOR}" = "${DESTINO}" ]; then
  echo "  Node ya esta en ${DESTINO}. Sigo igualmente con pm2 y las dependencias,"
  echo "  por si un intento anterior se quedo a medias."
fi

if ! command -v sudo >/dev/null 2>&1; then
  echo "  Hace falta sudo y no esta. Para aqui."
  exit 1
fi

# 1. COPIA DE LOS DATOS. Antes de tocar nada del sistema.
echo
echo "→ 1/6  Copia de seguridad de data/"
bash scripts/respaldo.sh || { echo "  No se pudo copiar data/. NO seguimos."; exit 1; }

# 2. NODE. nodesource reemplaza el paquete; apt se encarga del resto.
echo
echo "→ 2/6  Instalando Node ${DESTINO}"
if [ "${MAYOR}" = "${DESTINO}" ]; then
  echo "  Node ya esta en ${DESTINO}; se salta la instalacion."
else
  # needrestart SE COME EL SCRIPT SI NO SE LE DICE NADA.
  #
  # Ubuntu lo ejecuta despues de cada instalacion y saca un dialogo preguntando
  # que servicios reiniciar. Sin terminal interactiva se queda esperando una
  # respuesta que no va a llegar nunca, y por fuera parece que apt se ha
  # colgado: la ultima linea que se ve es "Scanning linux images...".
  #
  # NEEDRESTART_MODE=a  → reinicia los servicios que toque sin preguntar.
  # NEEDRESTART_SUSPEND=1 → y si aun asi quisiera abrir el dialogo, no lo abre.
  # DEBIAN_FRONTEND=noninteractive → lo mismo para cualquier otro paquete que
  #   quiera preguntar algo a mitad de la instalacion.
  export DEBIAN_FRONTEND=noninteractive
  export NEEDRESTART_MODE=a
  export NEEDRESTART_SUSPEND=1
  curl -fsSL "https://deb.nodesource.com/setup_${DESTINO}.x" | sudo -E bash - >/dev/null
  sudo -E apt-get install -y nodejs >/dev/null
fi
echo "  Node ahora: $(node -v)  ·  npm: $(npm -v)"

# 3. PM2. Estaba instalado con el Node viejo y su ruta ya no existe.
#    Sin esto, `pm2` deja de encontrarse o corre con restos del anterior.
echo
echo "→ 3/6  Reinstalando pm2 sobre el Node nuevo"
sudo npm install -g pm2 >/dev/null 2>&1
pm2 update >/dev/null 2>&1 || true

# 4. DEPENDENCIAS. Las que traen binario nativo se compilaron contra el ABI del
#    Node viejo y con el nuevo no cargan. Se rehacen desde cero.
echo
echo "→ 4/6  Rehaciendo node_modules (los binarios nativos no valen entre versiones)"
rm -rf node_modules
npm install --omit=dev --ignore-scripts --no-fund --no-audit --loglevel=error
rm -rf node_modules/sharp node_modules/@img

# 5. COMPROBAR ANTES DE REINICIAR. Si esto falla, el bot sigue como estaba.
echo
echo "→ 5/6  ¿Arranca el bot con el Node nuevo?"
if ! npm run --silent placeholders -- --breve || ! npm run --silent check -- --breve; then
  echo
  echo "════════════════════════════════════════════"
  echo "  NO SE REINICIA: el bot no pasa la comprobacion con Node ${DESTINO}."
  echo "  El proceso viejo sigue corriendo y sin tocar."
  echo "  Para volver a Node 20:   npm run node22 -- --volver"
  echo "════════════════════════════════════════════"
  exit 1
fi

# 6. Y ahora si.
echo
echo "→ 6/6  Reiniciando el bot"
pm2 restart bot --update-env >/dev/null || pm2 start ecosystem.config.js >/dev/null
pm2 save --force >/dev/null

echo
echo "→ Esperando a que conecte..."
sleep 12
npm run --silent estado

echo
echo "════════════════════════════════════════════"
echo "  LISTO — Node $(node -v)"
echo "  Si algo va mal:  npm run node22 -- --volver"
echo "════════════════════════════════════════════"
}

main "$@"

# EXIT EXPLICITO, por lo mismo que en actualizar.sh: bash lee el fichero por
# posicion de byte y este script no se reescribe a si mismo, pero el habito de
# cerrar el guion en cuanto main devuelve no cuesta nada y evita sorpresas.
exit 0
