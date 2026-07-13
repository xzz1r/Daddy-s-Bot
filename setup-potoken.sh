#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# setup-potoken.sh — solución PERMANENTE y autosostenible para el bloqueo
# "Sign in to confirm you're not a bot" de YouTube en IP de datacenter.
#
# Monta el BgUtils POT Provider: un servicio local que genera el "proof-of-origin
# token" que YouTube exige, SIN cookies que caducan. Queda corriendo 24/7 bajo
# pm2 (auto-reinicio, sobrevive a reinicios del server) y yt-dlp lo usa solo.
#
# Es re-ejecutable: si algún día YouTube rompe algo, vuelve a correr este mismo
# script y se actualiza a la última versión del provider + yt-dlp nightly. Esa
# es toda la intervención necesaria, y rara vez.
#
# Uso:  bash setup-potoken.sh   (dentro del servidor, por SSH)
#
# RAM: añade ~60-80 MB (un servicio Node siempre encendido). En el micro de 1 GB
# entra con swap; en el ARM va sobrado.
# ---------------------------------------------------------------------------
set -e

REPO="https://github.com/Brainicism/bgutil-ytdlp-pot-provider"
API="https://api.github.com/repos/Brainicism/bgutil-ytdlp-pot-provider/releases/latest"
FALLBACK_VERSION="1.3.1"   # se usa solo si la API de GitHub no responde

echo "==> [1/6] Instalando utilidades (git, curl, python3-pip)..."
sudo apt-get update -y
sudo apt-get install -y git curl python3-pip

echo "==> [2/6] Averiguando la última versión del POT provider..."
VERSION="$(curl -fsSL "$API" 2>/dev/null | grep -m1 '"tag_name"' | cut -d '"' -f4 | sed 's/^v//')"
if [ -z "$VERSION" ]; then
  VERSION="$FALLBACK_VERSION"
  echo "    (no se pudo consultar GitHub; usando versión de respaldo $VERSION)"
fi
echo "    Versión objetivo: $VERSION"

echo "==> [3/6] Clonando/actualizando el provider..."
cd ~
if [ ! -d bgutil-ytdlp-pot-provider ]; then
  git clone --single-branch --branch "$VERSION" "${REPO}.git"
else
  cd ~/bgutil-ytdlp-pot-provider
  git fetch --tags --force
  git checkout "$VERSION" 2>/dev/null || git checkout "tags/$VERSION"
  cd ~
fi

echo "==> [4/6] Compilando el servidor (1-2 min en el micro)..."
cd ~/bgutil-ytdlp-pot-provider/server
npm ci
npx tsc

echo "==> [5/6] Arrancando el servidor POT bajo pm2 (24/7, puerto 4416)..."
pm2 start build/main.js --name pot-provider 2>/dev/null || pm2 restart pot-provider
pm2 save

echo "==> [6/6] Instalando el plugin en yt-dlp y actualizando yt-dlp..."
# El plugin (paquete de PyPI) es lo que hace que yt-dlp hable con el servidor POT.
python3 -m pip install -U bgutil-ytdlp-pot-provider || \
  pip3 install -U bgutil-ytdlp-pot-provider || true
# yt-dlp al día: los arreglos del bot-check salen en el canal nightly.
yt-dlp --update-to nightly 2>/dev/null || \
  python3 -m pip install -U --pre "yt-dlp[default]" 2>/dev/null || true

echo ""
echo "==> Comprobando que el servidor POT responde..."
sleep 2
if curl -fsS "http://127.0.0.1:4416/ping" >/dev/null 2>&1; then
  echo "    OK: el servidor POT está vivo en el puerto 4416."
else
  echo "    AVISO: el servidor POT no respondió al ping. Revisa 'pm2 logs pot-provider'."
fi

echo ""
echo "======================================================================"
echo " POT provider instalado y corriendo (pm2 name: pot-provider)."
echo " Ahora reinicia el bot:"
echo "     pm2 restart bot"
echo " y prueba en un grupo:  !play <cancion>"
echo ""
echo " Deben verse DOS procesos online:   pm2 status"
echo "     'bot'  y  'pot-provider'"
echo " Para que sobrevivan a un reinicio del server:  pm2 startup   (y pega"
echo " el comando que imprima), luego  pm2 save."
echo "======================================================================"
