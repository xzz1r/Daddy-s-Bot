#!/usr/bin/env bash
# La puerta EXACTAMENTE como la corre GitHub, antes de empujar.
#
#   npm run ci
#
# EXISTE PORQUE `npm run check` EN TU COPIA NO BASTA. Tu copia tiene data/, la
# despensa llena, un state.json reciente y las herramientas que hayas ido
# instalando. GitHub no tiene nada de eso: clona limpio. Los dos primeros runs
# del CI salieron rojos por eso —temp/ que no estaba en git, una prueba que
# dependia de gifs guardados, yt-dlp que en la VPS esta y alli no— con el check
# en verde en local. Cada rojo es un correo al dueño.
#
# Aqui se prueba lo COMMITEADO (HEAD), en un clon nuevo, con las mismas
# herramientas que instala .github/workflows/check.yml. Si esto sale verde,
# GitHub sale verde. Si no, no se empuja.
set -euo pipefail

RAIZ="$(git rev-parse --show-toplevel)"
if ! git -C "$RAIZ" diff --quiet HEAD 2>/dev/null; then
  echo "Hay cambios sin commit: se prueba HEAD, que es lo que se empujaria."
fi

# Las herramientas que el workflow instala tienen que estar aqui tambien, o
# esto no prueba lo mismo que GitHub. La lista la vigila la capa 107.
for herramienta in yt-dlp; do
  if ! command -v "$herramienta" >/dev/null 2>&1 && [ ! -x "$HOME/.local/bin/$herramienta" ]; then
    echo "Falta $herramienta. El CI de GitHub lo instala; sin el esto no prueba lo mismo."
    exit 1
  fi
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git clone -q "$RAIZ" "$TMP/repo"
cd "$TMP/repo"
echo "→ Clon limpio de $(git rev-parse --short HEAD)"
npm ci --omit=dev --ignore-scripts --no-fund --no-audit --loglevel=error
echo "→ La puerta, como en GitHub"
node scripts/check.js --breve
echo "✓ Verde en limpio: se puede empujar."
