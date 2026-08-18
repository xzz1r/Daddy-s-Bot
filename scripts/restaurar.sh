#!/usr/bin/env bash
# Devuelve data/ a como estaba en una copia.
#
#   npm run restaurar            → lista las copias que hay
#   npm run restaurar -- ultima  → la mas reciente
#   npm run restaurar -- data-2026-08-18_0300.tar.gz
#
# PARA EL BOT ANTES DE TOCAR NADA. Si se restaura con el bot vivo, el proceso
# tiene su propia copia en memoria de esos JSON y al siguiente guardado pisa lo
# que se acaba de restaurar: parece que no ha servido de nada.
set -euo pipefail

cd "$(dirname "$0")/.."
DESTINO="${RESPALDO_DIR:-$HOME/respaldos-bot}"
QUE="${1:-}"

listar() {
  echo "Copias disponibles en $DESTINO:"
  ls -1t "$DESTINO"/data-*.tar.gz 2>/dev/null | while read -r f; do
    echo "  $(basename "$f")   $(du -h "$f" | cut -f1)   $(date -r "$f" '+%d/%m %H:%M')"
  done
  echo
  echo "Restaurar con:  npm run restaurar -- ultima"
}

[ -d "$DESTINO" ] || { echo "No hay ninguna copia todavia ($DESTINO no existe)."; exit 1; }
if [ -z "$QUE" ]; then listar; exit 0; fi

if [ "$QUE" = "ultima" ]; then
  FICHERO="$(ls -1t "$DESTINO"/data-*.tar.gz 2>/dev/null | head -1 || true)"
else
  FICHERO="$DESTINO/$(basename "$QUE")"
fi
[ -n "${FICHERO:-}" ] && [ -f "$FICHERO" ] || { echo "No encuentro esa copia."; echo; listar; exit 1; }

# Se comprueba ANTES de tocar data/. Restaurar desde un archivo roto y dejar el
# directorio a medias es peor que no haber restaurado.
tar -tzf "$FICHERO" >/dev/null 2>&1 || { echo "Esa copia esta corrupta. No se toca nada."; exit 1; }

if pgrep -f "node index.js" >/dev/null 2>&1; then
  echo "EL BOT ESTA CORRIENDO. Paralo primero o pisara lo restaurado:"
  echo "  pm2 stop bot && npm run restaurar -- $(basename "$FICHERO") && pm2 start bot"
  exit 1
fi

# Lo que hay ahora se guarda antes de sobrescribirlo: si la copia elegida no era
# la que se queria, todavia se puede volver.
if [ -d data ]; then
  PREVIO="$DESTINO/antes-de-restaurar-$(date +%Y-%m-%d_%H%M).tar.gz"
  tar -czf "$PREVIO" --exclude='data/music_cache' --exclude='data/pfpcache' --exclude='*.tmp' data
  echo "Lo que habia queda guardado en: $PREVIO"
fi

tar -xzf "$FICHERO" -C .
echo "Restaurado desde $(basename "$FICHERO")."
echo "Arranca el bot con: pm2 start bot"
