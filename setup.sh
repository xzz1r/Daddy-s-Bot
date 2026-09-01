#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# setup.sh — instala/actualiza TODAS las dependencias de sistema que el bot
# necesita en un servidor Ubuntu (Node, ffmpeg, yt-dlp, pm2) e instala las
# dependencias de npm. Es idempotente: se puede correr las veces que haga
# falta sin romper nada. Detecta solo si el servidor es ARM o x86 para bajar
# el yt-dlp correcto, así sirve tanto en el micro actual como en el ARM futuro.
#
# NO toca el cazador de capacidad (oci-arm-host-capacity) ni el cron.
#
# Uso:  bash setup.sh
# ---------------------------------------------------------------------------
set -e

echo "==> [1/6] Actualizando lista de paquetes..."
sudo apt-get update -y

echo "==> [2/6] Instalando ffmpeg, git y curl..."
sudo apt-get install -y ffmpeg git curl ca-certificates

echo "==> [3/6] Comprobando Node.js..."
if ! command -v node >/dev/null 2>&1; then
  echo "    Node no está, instalando Node 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "    Node: $(node -v)"

echo "==> [4/6] Instalando/actualizando yt-dlp (para la música)..."
ARCH="$(uname -m)"
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  YTDLP_BIN="yt-dlp_linux_aarch64"
else
  YTDLP_BIN="yt-dlp_linux"
fi
sudo curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/${YTDLP_BIN}" -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
echo "    yt-dlp: $(yt-dlp --version)"

echo "==> [5/6] Comprobando pm2..."
if ! command -v pm2 >/dev/null 2>&1; then
  echo "    pm2 no está, instalando..."
  sudo npm install -g pm2
fi
echo "    pm2: $(pm2 -v)"

echo "==> [6/6] Instalando dependencias del bot (npm)..."
npm install

echo ""
echo "======================================================================"
echo " Listo. Todo instalado. Ahora reinicia el bot para aplicar los cambios:"
echo "     pm2 restart bot"
echo " (o si es la primera vez:  pm2 start index.js --name bot && pm2 save )"
echo "======================================================================"
