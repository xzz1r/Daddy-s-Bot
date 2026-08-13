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

# El repo y la rama van CLAVADOS aquí, no se leen de la máquina.
#
# EXISTE POR UN FALLO REAL Y MUY CARO DE VER. El script hacía `git pull origin
# $(rama actual)`, o sea que se fiaba de lo que hubiera configurado en la VPS.
# Y lo que había era el repo VIEJO: el proyecto se movió de cuenta (xz1s/Bot- →
# xzz1r/Daddy-s-Bot) y el clon de la VPS se quedó apuntando al de antes. Nadie
# empuja ya ahí, así que el pull respondía "Already up to date", el script
# imprimía "YA ESTABA AL DÍA" tan contento y el bot seguía con código de hace
# semanas. No fallaba: mentía, que es peor.
#
# Lo mismo pasa con la rama. Si la máquina se quedó en una vieja
# —grok/frases-aura-robo va 26 commits por detrás— el pull funciona y no trae
# nada de lo nuevo.
#
# Por eso ahora se comprueban los dos y se corrigen solos. Si esto vuelve a
# desviarse, el despliegue lo arregla en vez de callarse.
REPO="https://github.com/xzz1r/Daddy-s-Bot"
RAMA="main"

ORIGEN="$(git remote get-url origin 2>/dev/null || echo '')"
if [ "${ORIGEN%.git}" != "${REPO%.git}" ]; then
  echo "  El repositorio configurado no es el bueno."
  echo "    tenía: ${ORIGEN:-<ninguno>}"
  echo "    pasa a: ${REPO}"
  git remote set-url origin "${REPO}" 2>/dev/null || git remote add origin "${REPO}"
  echo
fi

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

git fetch origin "${RAMA}"

# Si la máquina se quedó en otra rama, se la trae a la buena. El control de
# cambios locales de arriba ya pasó, así que aquí no se pisa nada de nadie.
AQUI="$(git rev-parse --abbrev-ref HEAD)"
if [ "${AQUI}" != "${RAMA}" ]; then
  echo "  Estaba en la rama ${AQUI}; se cambia a ${RAMA}."
  git checkout "${RAMA}" 2>/dev/null || git checkout -b "${RAMA}" "origin/${RAMA}"
fi

# Commits locales que no están en el repo: eso no lo borra este script sin
# avisar. Es rarísimo en una VPS —ahí solo se despliega— pero si pasa, se para.
ADELANTE="$(git rev-list --count "origin/${RAMA}..HEAD" 2>/dev/null || echo 0)"
if [ "${ADELANTE}" != "0" ]; then
  echo
  echo "  Hay ${ADELANTE} commit(s) aquí que no están en el repo:"
  git --no-pager log --oneline "origin/${RAMA}..HEAD" | sed 's/^/    · /'
  echo
  echo "  Súbelos con:  git push origin ${RAMA}"
  echo "  o tíralos con: git reset --hard origin/${RAMA}"
  exit 1
fi

# reset en vez de pull: deja el código EXACTAMENTE igual que el repo, sin
# importar en qué estado raro se hubiera quedado la máquina. Los datos del bot
# (aura, casino, rachas, sesión) están en data/ y fuera de git, así que esto no
# toca ni un punto de aura de nadie.
git reset --hard "origin/${RAMA}"

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

# ─── Antes de reiniciar: ¿arranca esto? ──────────────────────────────────────
#
# EXISTE PORQUE YA SE DESPLEGO CODIGO CAIDO. Un lote de frases entro con una
# comilla sin escapar y otro dejo catorce pools vacios; en los dos casos el
# fichero se subio, la VPS hizo pull y pm2 reinicio sobre algo que no cargaba.
# El bot se quedaba muerto y nadie se enteraba hasta que alguien escribia al
# grupo.
#
# Aqui se comprueba ANTES de tocar el proceso que esta corriendo. Si falla, no
# se reinicia: el bot sigue con el codigo viejo, que funciona, en vez de
# quedarse sin nada. Cuesta unos segundos y se ha ganado ese derecho.
echo
echo "→ Comprobando que el código nuevo arranca..."
if ! npm run check; then
  echo
  echo "════════════════════════════════════════════"
  echo "  NO SE REINICIA: el código nuevo no pasa la comprobación."
  echo "  El bot sigue corriendo con la versión anterior."
  echo "  Arregla lo de arriba y vuelve a lanzar: npm run update"
  echo "════════════════════════════════════════════"
  exit 1
fi

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
