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

# TODO EL CUERPO VA DENTRO DE UNA FUNCION, y no es estilo: es correccion.
#
# Este script se REESCRIBE A SI MISMO a mitad de ejecucion — el `git reset
# --hard` de mas abajo trae la version nueva de este mismo fichero. Y bash no
# lee un script entero de golpe: lo lee por posicion de byte segun lo va
# ejecutando. Si el fichero cambia de tamanyo bajo sus pies, la siguiente linea
# que ejecuta sale de un desplazamiento que ya no corresponde: puede saltarse
# ordenes, partir una por la mitad o ejecutar un trozo suelto.
#
# Ya paso: el despliegue que trajo el respaldo automatico no llego a hacer la
# copia, porque cuando arranco el script todavia era el de antes.
#
# Metido en una funcion, bash tiene que parsear el cuerpo ENTERO antes de
# ejecutar la primera linea. A partir de ahi el fichero puede cambiar lo que
# quiera: esta pasada ya corre desde memoria.
main() {

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
# —una rama vieja va 26 commits por detrás— el pull funciona y no trae
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

# package-lock.json lo reescribe el `npm install` DE ESTE MISMO SCRIPT.
#
# EXISTE PORQUE EL SCRIPT SE BLOQUEABA A SI MISMO. La primera pasada instalaba,
# npm tocaba el lock, y a partir de ahi TODAS las siguientes se paraban en el
# control de aqui abajo con "Hay cambios locales sin guardar: M
# package-lock.json". El bot se quedaba sin actualizar indefinidamente y el
# mensaje no ayudaba nada, porque no era nadie editando: era el propio
# despliegue de la vez anterior.
#
# Es un fichero generado, no escrito a mano, y el reset de mas abajo lo deja
# igual que en el repo de todas formas. Asi que se descarta y punto.
git checkout -- package-lock.json 2>/dev/null || true

# El resto de cambios locales SI se avisan. Los .bak y demás restos hacen que el
# pull falle o quede sucio, y borrar cambios de alguien sin decírselo no lo hace
# este script.
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

git fetch --quiet origin "${RAMA}"

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
git reset --hard --quiet "origin/${RAMA}"

DESPUES="$(git rev-parse --short HEAD)"
CUANTOS="$(git rev-list --count "${ANTES}..${DESPUES}" 2>/dev/null || echo 0)"

# --ignore-scripts y borrar sharp: sus binarios precompilados no siempre casan
# con esta máquina y su postinstall es de lo poco que puede tumbar un despliegue.
npm install --omit=dev --ignore-scripts --no-fund --no-audit --loglevel=error

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

# PLACEHOLDERS TAMBIEN, y esto se aprendio por poco. Aqui solo corria `check`,
# que mira que el bot arranca y responde — no que las frases esten bien
# enchufadas. Entro una reescritura de 130 frases de wingman y se desplego sin
# que nadie comprobara sus %N: paso, pero por suerte, no por comprobacion. Un
# placeholder suelto no rompe el bot, hace algo peor: manda "%A" en crudo al
# grupo, en publico y sin que salte nada.
#
# `pools` NO entra a proposito. Mide si un tramo se repite demasiado, que es
# calidad y no correccion, y ahora mismo sale en rojo por diseño (9 tramos
# cortos que le tocan a quien escribe las frases). Meterlo aqui bloquearia todos
# los despliegues por algo que no rompe nada.
if ! npm run --silent placeholders -- --breve; then
  echo
  echo "════════════════════════════════════════════"
  echo "  NO SE REINICIA: hay placeholders sin enchufar."
  echo "  Saldrían en crudo (%A, %N…) en el grupo."
  echo "════════════════════════════════════════════"
  exit 1
fi

if ! npm run --silent check -- --breve; then
  echo
  echo "════════════════════════════════════════════"
  echo "  NO SE REINICIA: el código nuevo no pasa la comprobación."
  echo "  El bot sigue corriendo con la versión anterior."
  echo "  Detalle completo de las 32 capas:  npm run check"
  echo "  Arregla lo de arriba y vuelve a lanzar: npm run update"
  echo "════════════════════════════════════════════"
  exit 1
fi

# Copia de data/ ANTES de reiniciar. El despliegue en si no toca los datos, pero
# es el momento en que el bot se para y arranca con codigo distinto, y si algo
# va a salir mal es aqui. Cuesta menos de un segundo y es la unica copia que se
# hace sola aunque nadie se acuerde del cron.
bash scripts/respaldo.sh || echo "  (aviso: no se pudo hacer la copia de data/, se sigue igual)"

# Sin esto el código nuevo no llega a ejecutarse. --update-env relee el .env,
# que es justo lo que hace falta cuando lo que cambió fue una key.
pm2 restart bot --update-env >/dev/null || pm2 start ecosystem.config.js >/dev/null
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

npm run --silent estado

# ─── Y AHORA LA PREGUNTA QUE IMPORTA: ¿corre lo que hay en disco? ────────────
#
# EXISTE PORQUE PASO Y NO SE NOTO. El despliegue trajo el codigo, dijo que todo
# habia ido bien, y el proceso siguio con un commit DIEZ por detras. El bot
# respondia con frases viejas mientras el fichero en disco era el nuevo, y
# encontrar eso costo media hora de mirar donde no era.
#
# `npm run estado` ya lo detectaba, pero como un aviso suave entre otros diez, y
# un aviso suave al final de una pared de texto no lo lee nadie. Aqui se compara
# a proposito y, si no cuadra, se reintenta el reinicio UNA vez y se grita.
CARGADO="$(pm2 logs bot --lines 200 --nostream 2>/dev/null | grep 'commit cargado' | tail -1 | grep -oE '[0-9a-f]{7,40}$' || true)"
CORTO="$(git rev-parse --short HEAD)"

if [ -n "${CARGADO}" ] && [ "${CARGADO}" != "${CORTO}" ]; then
  echo
  echo "  El proceso corre ${CARGADO} y en disco esta ${CORTO}. Reintentando el reinicio..."
  pm2 restart bot --update-env >/dev/null 2>&1 || true
  sleep 12
  CARGADO="$(pm2 logs bot --lines 200 --nostream 2>/dev/null | grep 'commit cargado' | tail -1 | grep -oE '[0-9a-f]{7,40}$' || true)"
fi

echo
if [ -z "${CARGADO}" ]; then
  echo "  No he podido leer que commit corre el bot (aun no ha conectado)."
  echo "  Compruebalo en un minuto:  pm2 logs bot --lines 5 --nostream | grep 'commit cargado'"
elif [ "${CARGADO}" = "${CORTO}" ]; then
  echo "  ✓ El bot corre lo que hay en disco (${CORTO})."
else
  echo "════════════════════════════════════════════"
  echo "  ATENCION: el bot sigue en ${CARGADO} y en disco esta ${CORTO}."
  echo "  El codigo nuevo NO se esta ejecutando. Prueba a mano:"
  echo "    pm2 delete bot && pm2 start ecosystem.config.js"
  echo "════════════════════════════════════════════"
  exit 1
fi

}

main "$@"

# EXIT EXPLICITO, y es obligatorio en este fichero.
#
# El main() de arriba protege el CUERPO: bash parsea la funcion entera antes de
# ejecutarla, asi que el git reset puede reescribir el fichero sin romper la
# pasada. Pero cuando main termina, bash vuelve al fichero a buscar mas ordenes
# desde la posicion de byte en la que se quedo — y el fichero de ahora es OTRO,
# normalmente mas largo. Ahi lee trozos sueltos del texto nuevo y los ejecuta.
#
# Paso de verdad en el despliegue de 4ed51b7: tras terminar bien, la terminal
# escupio media linea del bloque de verificacion y bash contesto
# "syntax error near unexpected token \'(\'". El despliegue habia ido bien; la
# basura venia de seguir leyendo un fichero que ya no era el mismo.
#
# Con esto bash cierra el guion en cuanto main devuelve y no lee un byte mas.
exit 0
