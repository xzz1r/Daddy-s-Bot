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

# Se excluyen las caches: son 80 MB que el bot regenera solo (musica y fotos).
# Meterlas convertiria una copia de 100 KB en uno de 80 MB y no salvaria nada
# que importe. Los .tmp son restos de escrituras a medias.
tar -czf "$FICHERO" \
  --exclude="$ORIGEN/music_cache" \
  --exclude="$ORIGEN/pfpcache" \
  --exclude="*.tmp" \
  "$ORIGEN"

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
N="$(ls -1 "$DESTINO"/data-*.tar.gz 2>/dev/null | wc -l)"
echo "Copia hecha: $FICHERO ($TAM)"
echo "Guardadas $N de las ultimas $CUANTAS. Restaurar con: npm run restaurar"
