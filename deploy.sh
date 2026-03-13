#!/bin/bash
set -e

echo "=== Travel Telegram Bot - Deploy ==="

mkdir -p logs

echo ">> Instalando dependencias..."
npm ci --omit=dev

echo ">> Generando cliente Prisma..."
npx prisma generate

echo ">> Compilando TypeScript..."
npm run build

echo ">> Reiniciando bot con PM2..."
if pm2 describe travel-telegram-bot > /dev/null 2>&1; then
  pm2 restart ecosystem.config.cjs --env production
else
  pm2 start ecosystem.config.cjs --env production
fi

pm2 save

echo "=== Deploy completado ==="
pm2 status
