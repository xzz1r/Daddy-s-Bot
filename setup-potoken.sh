#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# setup-potoken.sh — instala la solución PERMANENTE y autosostenible para el
# bloqueo "Sign in to confirm you're not a bot" de YouTube en IP de datacenter.
#
# Monta el BgUtils POT Provider: un pequeño servicio local que genera solo el
# "proof-of-origin token" que YouTube exige, sin cookies que renovar. Queda
# corriendo 24/7 bajo pm2 (auto-reinicio) y yt-dlp lo usa de forma automática.
#
# Uso:  bash setup-potoken.sh   (dentro del servidor, por SSH)
#
# Nota: añade ~60-80 MB de RAM (un servicio Node siempre encendido). En el micro
# de 1 GB entra con el swap; en el ARM va sobrado. La versión está fijada abajo;
# si algún día YouTube la rompe, subí el número de VERSION a la última release.
# ---------------------------------------------------------------------------
set -e

VERSION="1.3.1"
REPO="https://github.com/Brainicism/bgutil-ytdlp-pot-provider"

echo "==> [1/5] Instalando utilidades (git, unzip, curl)..."
sudo apt-get update -y
sudo apt-get install -y git unzip curl

echo "==> [2/5] Clonando el POT provider (v${VERSION})..."
cd ~
if [ ! -d bgutil-ytdlp-pot-provider ]; then
  git clone --single-branch --branch "${VERSION}" "${REPO}.git"
fi

echo "==> [3/5] Compilando el servidor (puede tardar 1-2 min en el micro)..."
cd ~/bgutil-ytdlp-pot-provider/server
npm ci
npx tsc

echo "==> [4/5] Arrancando el servidor POT bajo pm2 (24/7, puerto 4416)..."
pm2 start build/main.js --name pot-provider 2>/dev/null || pm2 restart pot-provider
pm2 save

echo "==> [5/5] Instalando el plugin en yt-dlp (binario standalone)..."
mkdir -p ~/.config/yt-dlp/plugins
cd ~/.config/yt-dlp/plugins
curl -L -o bgutil.zip "${REPO}/releases/download/${VERSION}/bgutil-ytdlp-pot-provider.zip"
unzip -o bgutil.zip
rm -f bgutil.zip

echo ""
echo "======================================================================"
echo " POT provider instalado y corriendo (pm2 name: pot-provider)."
echo " Ahora reinicia el bot y prueba:"
echo "     pm2 restart bot"
echo "     # luego en un grupo:  !play <cancion>"
echo ""
echo " Verificar que el servicio POT esté vivo:   pm2 status"
echo " (deben verse DOS procesos: 'bot' y 'pot-provider', ambos online)"
echo "======================================================================"
