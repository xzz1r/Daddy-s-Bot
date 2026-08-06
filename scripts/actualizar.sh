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

git pull origin "${RAMA}"

# --ignore-scripts y borrar sharp: sus binarios precompilados no siempre casan
# con esta máquina y su postinstall es de lo poco que puede tumbar un despliegue.
npm install --omit=dev --ignore-scripts
rm -rf node_modules/sharp

# Sin esto el código nuevo no llega a ejecutarse. --update-env relee el .env,
# que es justo lo que hace falta cuando lo que cambió fue una key.
pm2 restart bot --update-env || pm2 start ecosystem.config.js
pm2 save --force >/dev/null

echo
npm run estado
