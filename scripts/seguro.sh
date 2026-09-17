#!/usr/bin/env bash
# Una copia de la que se puede volver ENTERA, no solo de los datos.
#
#   npm run seguro            → copia con la fecha
#   npm run seguro -- antes-de-grok
#
# POR QUE NO BASTA CON respaldo.sh. Ese guarda data/ —los conteos, la economia
# y la sesion de WhatsApp— y eso es lo que hace falta a diario. Pero deja fuera
# dos cosas que, si se pierden, no se recuperan de ningun sitio:
#
#   · EL .env. Lleva las claves de las APIs y el numero del guardian. No esta
#     en el repositorio (y no puede estarlo: es publico), asi que si alguien lo
#     pisa no hay de donde sacarlo. Es la perdida mas cara de todas y la que
#     ninguna copia cubria.
#   · EL ESTADO DE GIT. Que commit corria y si habia algo tocado a mano. Sin
#     eso, "vuelve a como estaba" no tiene a donde volver.
#
# Esto existe para cuando alguien va a TOCAR la maquina: un agente, una prueba
# de rendimiento, una tarde de cambiar cosas. Se hace una copia con etiqueta
# antes de empezar y la vuelta atras es una linea.
set -euo pipefail

cd "$(dirname "$0")/.."
ORIGEN="$PWD"
DESTINO="${RESPALDO_DIR:-$HOME/respaldos-bot}"
ETIQUETA="${1:-manual}"
# Solo letras, numeros, punto y guion: la etiqueta va en un nombre de fichero.
ETIQUETA="$(printf '%s' "$ETIQUETA" | tr -c 'A-Za-z0-9._-' '-')"
SELLO="$(date +%Y-%m-%d_%H%M%S)"
FICHERO="$DESTINO/seguro-${ETIQUETA}-${SELLO}.tar.gz"

mkdir -p "$DESTINO"
chmod 700 "$DESTINO" 2>/dev/null || true

# El estado de git se guarda como texto DENTRO de la copia: asi la copia se
# explica sola dentro de seis meses, sin depender de que el repositorio siga
# igual.
# El fichero va con nombre propio: dentro del tar se lee "ESTADO-GIT.txt" y no
# un "tmp.9kZq" que no le dice nada a nadie.
TMPDIR_ESTADO="$(mktemp -d)"
ESTADO="$TMPDIR_ESTADO/ESTADO-GIT.txt"
{
  echo "fecha: $SELLO"
  echo "etiqueta: $ETIQUETA"
  echo "rama: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  echo "commit: $(git rev-parse HEAD 2>/dev/null || echo '?')"
  echo "cambios locales:"
  git status --porcelain 2>/dev/null | sed 's/^/  /' || true
} > "$ESTADO"

# --ignore-failed-read: si falta el ecosystem o el .env, la copia se hace igual
# con lo que haya en vez de fallar entera. Y los caches quedan fuera: pesan y
# se vuelven a llenar solos.
CODIGO=0
tar -czf "$FICHERO" \
  --exclude='data/music_cache' \
  --exclude='data/pfpcache' \
  --exclude='*.tmp' \
  --ignore-failed-read \
  -C "$ORIGEN" data $([ -f .env ] && echo .env) $([ -f ecosystem.config.js ] && echo ecosystem.config.js) \
  -C "$TMPDIR_ESTADO" ESTADO-GIT.txt 2>/dev/null || CODIGO=$?
rm -rf "$TMPDIR_ESTADO"

# El codigo 1 de tar es "un fichero cambio mientras lo leia" —el bot escribe
# cada pocos segundos— y no rompe el archivo. Cualquier otro si.
if [ "$CODIGO" -gt 1 ]; then
  rm -f "$FICHERO"
  echo "tar falló (código $CODIGO). NO se ha guardado nada."
  exit 1
fi

# Y se COMPRUEBA que se puede leer. Una copia que no se abre no es una copia, y
# de eso uno se entera el dia que la necesita.
if ! tar -tzf "$FICHERO" >/dev/null 2>&1; then
  rm -f "$FICHERO"
  echo "La copia salió corrupta. NO se ha guardado nada."
  exit 1
fi

# Lleva el .env dentro: solo el dueño la lee.
chmod 600 "$FICHERO"

PESO="$(du -h "$FICHERO" | cut -f1)"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"
# SE DICE LO QUE HAY DENTRO, NO LO QUE SE PRETENDIA METER.
#
# Un resumen que anuncia el .env cuando no habia .env es peor que no decir
# nada: se confia en una copia que no cubre lo que uno cree. Se lee del propio
# archivo, que es quien lo sabe.
DENTRO="$(tar -tzf "$FICHERO")"
LLEVA="data/ (conteos, economía y sesión)"
printf '%s\n' "$DENTRO" | grep -qx '\.env' && LLEVA="$LLEVA, .env" || LLEVA="$LLEVA, SIN .env (no existe)"
printf '%s\n' "$DENTRO" | grep -qx 'ecosystem.config.js' && LLEVA="$LLEVA, ecosystem"
echo "Copia completa: $FICHERO ($PESO)"
echo "  · incluye $LLEVA y el estado de git ($COMMIT)"
echo
echo "  Para volver a este punto EXACTO:"
echo "    pm2 stop bot guardian"
echo "    cd $ORIGEN && git reset --hard $COMMIT"
echo "    tar -xzf $FICHERO -C $ORIGEN"
echo "    pm2 start bot guardian"
