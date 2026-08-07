#!/usr/bin/env bash
# Actualiza el bot en la VPS de una sola pasada.
#
#   npm run update
#
# Hace lo mismo que se venía haciendo a mano, en el orden correcto y sin que se
# olvide ninguno de los pasos. La versión anterior era `git pull && npm install`
# y se quedaba corta en tres cosas que había que recordar cada vez:
#
#   · `git pull` a secas depende de que la rama tenga upstream configurado; si
#     no lo tiene, falla o se trae la rama equivocada. Aquí se nombra siempre.
#   · no reiniciaba pm2, así que el código nuevo se quedaba en disco sin correr
#     y el bot seguía con el viejo — pareciendo actualizado.
#   · no comprobaba nada después.
set -euo pipefail

cd "$(dirname "$0")/.."

RAMA="$(git rev-parse --abbrev-ref HEAD)"
echo "→ Actualizando la rama ${RAMA}"

# Los .bak y demás restos hacen que el pull falle o quede sucio. Se avisa antes
# de tocar nada: borrar cambios de alguien sin decírselo no lo hace este script.
if [ -n "$(git status --porcelain)" ]; then
  echo
  echo "  Hay cambios locales sin guardar:"
  git status --porcelain | sed 's/^/    /'
  echo
  echo "  Descártalos con:  git checkout -- . && git clean -fd"
  echo "  o guárdalos con:  git stash"
  exit 1
fi

ANTES="$(git rev-parse --short HEAD)"

git pull origin "${RAMA}"

DESPUES="$(git rev-parse --short HEAD)"
CUANTOS="$(git rev-list --count "${ANTES}..${DESPUES}" 2>/dev/null || echo 0)"

# --ignore-scripts y borrar sharp: sus binarios precompilados no siempre casan
# con esta máquina y su postinstall es de lo poco que puede tumbar un despliegue.
npm install --omit=dev --ignore-scripts

# sharp y SUS BINARIOS. Se borraba la carpeta sharp pero no @img, que es donde
# viven los binarios de verdad: 27 MB de libvips y un fallback WebAssembly que
# en linux-x64 no se ejecuta jamás. Nadie declara sharp como dependencia — es
# residuo de una instalación vieja — así que no hay nada que se quede sin él.
rm -rf node_modules/sharp node_modules/@img

# Sin esto el código nuevo no llega a ejecutarse. --update-env relee el .env,
# que es justo lo que hace falta cuando lo que cambió fue una key.
pm2 restart bot --update-env || pm2 start ecosystem.config.js
pm2 save --force >/dev/null

# Veredicto explícito. Sin esto no había forma de saber si el comando había
# hecho algo: imprimía la salida de git y de npm, que dicen "Already up to
# date" o no dicen nada, y el resultado quedaba a interpretación.
echo
echo "════════════════════════════════════════════"
if [ "${ANTES}" = "${DESPUES}" ]; then
  echo "  YA ESTABA AL DÍA — sigue en ${DESPUES}"
  echo "  (aun así se ha reiniciado, por si el proceso corría código viejo)"
else
  echo "  ACTUALIZADO: ${ANTES} → ${DESPUES}  (${CUANTOS} commits)"
  git --no-pager log --oneline "${ANTES}..${DESPUES}" | sed 's/^/    · /'
fi
echo "════════════════════════════════════════════"

# El bot imprime su commit AL CONECTAR, no al arrancar. Sin esta espera, la
# comprobacion de "¿corre lo que hay en disco?" mira un log que todavia es del
# proceso anterior y da un falso "se actualizo sin reiniciar" que asusta sin
# motivo. Doce segundos bastan para una conexion normal.
echo
echo "→ Esperando a que el bot conecte..."
sleep 12

npm run estado
