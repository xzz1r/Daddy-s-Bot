#!/usr/bin/env bash
# Copia de seguridad de data/.
#
#   npm run respaldo
#
# EXISTE PORQUE data/ NO ESTA EN GIT Y NO SE RECUPERA. Ahi viven el aura de
# todo el grupo, las rachas, los contadores, la lista negra y la sesion de
# WhatsApp. El codigo se recupera con un `git reset`; esto no se recupera con
# nada. Un `rm` desafortunado, un script que escribe donde no debe o un disco
# lleno a media escritura se lo llevan por delante y no hay vuelta atras.
#
# La copia va FUERA del directorio del bot a proposito: si el accidente es un
# `rm -rf` en la carpeta del proyecto, una copia dentro se va con el resto.
set -euo pipefail

cd "$(dirname "$0")/.."
ORIGEN="data"
DESTINO="${RESPALDO_DIR:-$HOME/respaldos-bot}"
CUANTAS=7

[ -d "$ORIGEN" ] || { echo "No existe $ORIGEN; nada que copiar."; exit 1; }
mkdir -p "$DESTINO"

SELLO="$(date +%Y-%m-%d_%H%M)"
FICHERO="$DESTINO/data-$SELLO.tar.gz"

# EL BOT ESTA ESCRIBIENDO MIENTRAS SE COPIA, Y ESO NO ES UN FALLO.
#
# `data/` es un directorio VIVO: el aura, las rachas y los contadores se tocan
# cada pocos segundos. Cuando un fichero cambia mientras tar lo lee, tar avisa
# —«file changed as we read it»— y SALE CON CODIGO 1. Con `set -e`, eso abortaba
# el guion antes de llegar a la comprobacion de abajo, y el despliegue decia
# «aviso: no se pudo hacer la copia de data/, se sigue igual».
#
# O sea que justo el momento en que mas falta hace una copia —un despliegue, con
# el bot en marcha— era el momento en que no se hacia ninguna. Y se leia como un
# aviso menor.
#
# El 1 de tar no dice que el archivo este roto: dice que un fichero cambio. Lo
# que decide si la copia vale es la verificacion de mas abajo, que ya estaba y
# es la buena. Del 2 para arriba si es un error de verdad (disco lleno, permisos)
# y ahi se para.
#
# Y se excluyen las caches: son 80 MB que el bot regenera solo (musica y fotos).
# Meterlas convertiria una copia de 100 KB en una de 80 MB y no salvaria nada
# que importe. Los .tmp son restos de escrituras a medias.
set +e
SALIDA_TAR="$(tar -czf "$FICHERO" \
  --exclude="$ORIGEN/music_cache" \
  --exclude="$ORIGEN/pfpcache" \
  --exclude="*.tmp" \
  "$ORIGEN" 2>&1)"
CODIGO_TAR=$?
set -e

if [ "$CODIGO_TAR" -gt 1 ]; then
  rm -f "$FICHERO"
  echo "tar fallo (codigo $CODIGO_TAR). NO se ha respaldado nada:"
  printf '%s\n' "$SALIDA_TAR" | sed 's/^/    /'
  exit 1
fi

# UNA COPIA QUE NO SE COMPRUEBA NO ES UNA COPIA. Si el disco estaba lleno o el
# tar se corto, el fichero existe igual y parece que todo fue bien — y eso se
# descubre el dia que hace falta restaurar, que es el peor dia posible.
if ! tar -tzf "$FICHERO" >/dev/null 2>&1; then
  rm -f "$FICHERO"
  echo "La copia salio corrupta y se ha borrado. NO se ha respaldado nada."
  exit 1
fi

# Rotacion: se quedan las CUANTAS mas nuevas y el resto fuera.
ls -1t "$DESTINO"/data-*.tar.gz 2>/dev/null | tail -n +$((CUANTAS + 1)) | while read -r v; do
  rm -f "$v"
done

TAM="$(du -h "$FICHERO" | cut -f1)"
# Si algun fichero cambio a mitad, se dice —la copia vale, pero ESE fichero
# puede haber quedado a medias— y no se disfraza de exito silencioso.
if [ "$CODIGO_TAR" -eq 1 ]; then
  # Con `set -e`, un `[ ... ] && echo` como ULTIMA orden de un if aborta el
  # guion cuando la condicion es falsa: el compuesto devuelve 1. Por eso va
  # como if y no como and.
  CAMBIADOS="$(printf '%s\n' "$SALIDA_TAR" | grep -c 'changed as we read it' || true)"
  if [ "${CAMBIADOS:-0}" -gt 0 ]; then
    echo "  (el bot escribio en ${CAMBIADOS} fichero(s) durante la copia; el archivo se ha verificado y vale)"
  fi
fi

N="$(ls -1 "$DESTINO"/data-*.tar.gz 2>/dev/null | wc -l)"
echo "Copia hecha: $FICHERO ($TAM)"
echo "Guardadas $N de las ultimas $CUANTAS. Restaurar con: npm run restaurar"
