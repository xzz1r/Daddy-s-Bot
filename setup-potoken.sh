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

echo "==> [6/6] Instalando el plugin en yt-dlp (ZIP en la carpeta de plugins)..."
# CLAVE: yt-dlp aquí es un BINARIO standalone (/usr/local/bin/yt-dlp). Ese binario
# NO carga plugins instalados con pip; solo los que estén como ZIP/carpeta en
# ~/.config/yt-dlp/plugins/. Por eso se instala así y NO con pip.
mkdir -p ~/.config/yt-dlp/plugins
cd ~/.config/yt-dlp/plugins
rm -rf bgutil-ytdlp-pot-provider*   # limpia instalaciones previas
curl -fsSL -o bgutil-pot.zip \
  "${REPO}/releases/download/${VERSION}/bgutil-ytdlp-pot-provider.zip" || \
  curl -fsSL -o bgutil-pot.zip \
  "${REPO}/releases/latest/download/bgutil-ytdlp-pot-provider.zip"
unzip -o bgutil-pot.zip >/dev/null
rm -f bgutil-pot.zip
# Por si quedó una copia vieja mal instalada por pip (el binario no la usa, pero
# limpia dudas):
python3 -m pip uninstall -y bgutil-ytdlp-pot-provider >/dev/null 2>&1 || true

echo ""
echo "==> Verificando de verdad que el POT funciona (esto es lo que importa)..."
sleep 2
# ¿El servidor POT está escuchando en el 4416?
if (exec 3<>/dev/tcp/127.0.0.1/4416) 2>/dev/null; then
  echo "    [1/2] Servidor POT: ESCUCHANDO en 4416."
else
  echo "    [1/2] Servidor POT: NO responde. Revisa 'pm2 logs pot-provider'."
fi
# ¿yt-dlp carga el plugin Y pasa el bot-check en un video real?
TESTURL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
LOG="$(yt-dlp -v --simulate --no-warnings "$TESTURL" 2>&1 || true)"
if echo "$LOG" | grep -qi "PO Token Providers.*bgutil"; then
  echo "    [2/2] Plugin POT: CARGADO (yt-dlp lo ve)."
else
  echo "    [2/2] Plugin POT: NO cargado. yt-dlp no encontró el plugin."
fi
if echo "$LOG" | grep -qi "sign in to confirm"; then
  echo "    RESULTADO: TODAVÍA BLOQUEADO. Mira el aviso de arriba."
elif echo "$LOG" | grep -qi "Extracting URL\|Downloading.*player\|format"; then
  echo "    RESULTADO: OK — extracción sin bot-check. !play debería funcionar."
else
  echo "    RESULTADO: no concluyente; corre el comando de prueba manual de abajo."
fi

echo ""
echo "======================================================================"
echo " Ahora reinicia el bot:   pm2 restart bot"
echo " y prueba en un grupo:    !play <cancion>"
echo ""
echo " Prueba manual de POT (debe salir una línea con 'bgutil'):"
echo "   yt-dlp -v --simulate 'https://youtu.be/dQw4w9WgXcQ' 2>&1 | grep -i pot"
echo ""
echo " pm2 status  → deben verse 'bot' y 'pot-provider' online."
echo "======================================================================"
