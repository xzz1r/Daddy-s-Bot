#!/data/data/com.termux/files/usr/bin/bash
set -e

echo ""
echo "╔══════════════════════════════╗"
echo "║   SocialBot - Setup Termux   ║"
echo "╚══════════════════════════════╝"
echo ""

echo "[1/5] Actualizando paquetes..."
pkg update -y && pkg upgrade -y

echo ""
echo "[2/5] Instalando dependencias del sistema..."
pkg install -y nodejs ffmpeg git python

echo ""
echo "[3/5] Instalando yt-dlp (descarga de música)..."
pip install -q yt-dlp 2>/dev/null || pip3 install -q yt-dlp

echo ""
echo "[4/5] Instalando dependencias de Node..."
# Borrar node_modules y package-lock para garantizar instalación limpia
rm -rf node_modules package-lock.json
# --ignore-scripts evita que sharp (dep interna de baileys) intente compilarse en ARM
npm install --ignore-scripts
# Borrar sharp ya que no lo usamos y falla en Android ARM
rm -rf node_modules/sharp

echo ""
echo "[5/5] Configurando archivo .env..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  Editá el archivo .env con tu número de teléfono:"
  echo "    nano .env"
  echo ""
  echo "    Ejemplo: OWNER_NUMBER=5491112345678"
  echo "    (código de país + número, sin + ni espacios)"
else
  echo "    .env ya existe, no se sobreescribió."
fi

echo ""
echo "✅ Instalación completada."
echo ""
echo "Para iniciar el bot:"
echo "    npm start"
echo ""
echo "Escaneá el QR con WhatsApp → Dispositivos vinculados → Vincular dispositivo"
echo ""
