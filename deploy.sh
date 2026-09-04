#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

APP_NAME="travel-telegram-bot"
REQUIRED_NODE_MAJOR=22

echo "=== Travel Telegram Bot - Deploy ==="
echo ">> Directorio: $ROOT_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: comando requerido no encontrado: $1" >&2
    exit 1
  fi
}

require_cmd node
require_cmd npm
require_cmd npx
require_cmd pm2

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]]; then
  echo "ERROR: se requiere Node.js >= ${REQUIRED_NODE_MAJOR}. Actual: $(node -v)" >&2
  exit 1
fi
echo ">> Node: $(node -v)"

if [[ ! -f .env ]]; then
  echo "ERROR: falta .env (copia .env.example y configúralo)" >&2
  exit 1
fi

env_has_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" .env | tail -n1 || true)"
  if [[ -z "$line" ]]; then
    return 1
  fi
  local value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  [[ -n "$value" ]]
}

for key in TELEGRAM_BOT_TOKEN DATABASE_URL; do
  if ! env_has_value "$key"; then
    echo "ERROR: variable requerida ausente o vacía en .env: $key" >&2
    exit 1
  fi
done
echo ">> .env: variables críticas presentes"

mkdir -p logs

echo ">> Instalando dependencias (npm ci)..."
npm ci

echo ">> Generando cliente Prisma..."
npx prisma generate

echo ">> Compilando TypeScript..."
npm run build

if [[ ! -f dist/index.js ]]; then
  echo "ERROR: no se generó dist/index.js" >&2
  exit 1
fi

echo ">> Podando dependencias de desarrollo..."
npm prune --omit=dev

echo ">> Reiniciando bot con PM2..."
export DEPLOY_NODE_BIN="$(command -v node)"
echo ">> PM2 interpreter: $DEPLOY_NODE_BIN ($(node -v))"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart ecosystem.config.cjs --env production --update-env
else
  pm2 start ecosystem.config.cjs --env production
fi

pm2 save
pm2 status

sleep 2

STATUS="$(pm2 jlist | node -e "
const fs = require('fs');
const apps = JSON.parse(fs.readFileSync(0, 'utf8'));
const app = apps.find((a) => a.name === process.argv[1]);
process.stdout.write(app && app.pm2_env ? (app.pm2_env.status || '') : '');
" "$APP_NAME")"

if [[ "$STATUS" != "online" ]]; then
  echo "ERROR: $APP_NAME no está online (status=${STATUS:-unknown})" >&2
  echo "Revisa logs: pm2 logs $APP_NAME --err --lines 50" >&2
  exit 1
fi

echo "=== Deploy completado ($APP_NAME online) ==="
