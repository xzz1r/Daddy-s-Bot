#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# setup.sh — prepara un servidor Ubuntu NUEVO para el bot: Node 22, ffmpeg,
# yt-dlp, pm2 (con arranque al reiniciar y rotación de logs) y las dependencias
# de npm, igual que las instala `npm run update`. Es idempotente: se puede
# correr las veces que haga falta sin romper nada. Detecta si el servidor es
# ARM o x86 para bajar el yt-dlp correcto.
#
# NO toca el cazador de capacidad (oci-arm-host-capacity) ni el cron.
# NO vincula WhatsApp ni copia datos: eso son pasos a mano, y al final se dicen.
#
# Uso:  bash setup.sh
# ---------------------------------------------------------------------------
set -e
cd "$(dirname "$0")"

echo "==> [1/7] Actualizando lista de paquetes..."
sudo apt-get update -y

echo "==> [2/7] Instalando ffmpeg, git y curl..."
sudo apt-get install -y ffmpeg git curl ca-certificates

# NODE 22 COMO MINIMO, no solo "que haya Node". package.json pide >=22 y una
# imagen de Ubuntu puede traer el 12 o el 18: antes eso pasaba de largo y el
# bot reventaba al arrancar.
echo "==> [3/7] Comprobando Node.js (hace falta 22 o más)..."
NODE_MAYOR="$(node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/')"
if [ -z "$NODE_MAYOR" ] || [ "$NODE_MAYOR" -lt 22 ]; then
  echo "    Node ${NODE_MAYOR:-ausente}: instalando Node 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "    Node: $(node -v)"

echo "==> [4/7] Instalando/actualizando yt-dlp (música, TikTok, Instagram)..."
ARCH="$(uname -m)"
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  YTDLP_BIN="yt-dlp_linux_aarch64"
else
  YTDLP_BIN="yt-dlp_linux"
fi
sudo curl -fL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/${YTDLP_BIN}" -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
echo "    yt-dlp: $(/usr/local/bin/yt-dlp --version)"
# El bot busca primero ~/.local/bin/yt-dlp (lo que deja pip). Si hay una copia
# vieja ahí, ganaría a la que se acaba de bajar.
if [ -x "$HOME/.local/bin/yt-dlp" ]; then
  echo "    OJO: hay otro yt-dlp en ~/.local/bin y el bot usará ESE."
  echo "         Actualízalo con:  pip install -U yt-dlp"
fi

echo "==> [5/7] Comprobando pm2..."
if ! command -v pm2 >/dev/null 2>&1; then
  echo "    pm2 no está, instalando..."
  sudo npm install -g pm2
fi
echo "    pm2: $(pm2 -v)"
# Rotación de logs: sin ella los logs de pm2 crecen hasta llenar el disco.
if ! pm2 ls 2>/dev/null | grep -q logrotate; then
  pm2 install pm2-logrotate >/dev/null
  echo "    pm2-logrotate instalado"
fi
# Que el bot vuelva solo si se reinicia el servidor.
sudo env PATH="$PATH" pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null
echo "    arranque al reiniciar el servidor: activado"

# LAS DEPENDENCIAS, IGUAL QUE `npm run update`. Un `npm install` a secas corre
# los postinstall (el de sharp puede tumbar la instalación) y no aplica el
# parche de Baileys: el servidor nuevo arrancaría con un Baileys distinto del
# que se ha probado.
echo "==> [6/7] Instalando dependencias del bot (npm)..."
npm install --omit=dev --ignore-scripts --no-fund --no-audit --loglevel=error
node scripts/parche-baileys-historial.js || true
rm -rf node_modules/sharp node_modules/@img

echo "==> [7/7] Preparando .env y data/..."
mkdir -p data temp
if [ ! -f .env ]; then
  cp .env.example .env
  echo "    .env creado desde .env.example: RELLÉNALO antes de arrancar."
else
  echo "    .env ya existe: no se toca."
fi

cat <<'FIN'

======================================================================
 Instalado. Lo que falta, a mano y EN ESTE ORDEN:

 1. Rellena el .env (OWNER_NUMBER, claves...).

 2. Si vienes de otro servidor, trae los datos:
      en el VIEJO:  pm2 stop all && npm run respaldo
      copia el .tar.gz a ~/respaldos-bot/ de ESTE servidor y aquí:
                    npm run restaurar -- ultima
    (la copia lleva también la sesión de WhatsApp, data/auth)
    NUNCA tengas los dos servidores encendidos con la misma sesión de
    WhatsApp: se pisan y WhatsApp puede cerrarla.

 3. Si NO traes la sesión (data/auth), vincula el bot:
      node index.js --codigo <número del bot>
    y Ctrl+C cuando diga conectado.

 4. Arranca y guarda:
      pm2 start ecosystem.config.js --only bot && pm2 save
    El guardián se vincula aparte (ver MOTOR.md, «El guardián»).

 5. Comprueba:  npm run estado
======================================================================
FIN
