# Diseño: Despliegue PM2 del Travel Telegram Bot

Fecha: 2026-09-04  
Estado: aprobado en diálogo; pendiente de plan de implementación

## Objetivo

Permitir ejecutar `bash deploy.sh` en el VPS (CloudPanel / Hostinger) de forma que el bot se compile e inicie o reinicie correctamente con PM2, sin `git pull` dentro del script.

## Decisiones

| Tema | Decisión |
|------|----------|
| Runtime | PM2 en el host (no Docker) |
| Git | Fuera del script: `git pull origin main && bash deploy.sh` |
| Dependencias de build | `npm ci` completo → build → `npm prune --omit=dev` |
| Redis | Redis del sistema (`127.0.0.1:6379`) |
| Modo bot | `polling` (sin cambios de nginx/webhook) |

## Arquitectura

```
Operador
  │
  ├─ git pull origin main          (manual)
  └─ bash deploy.sh
        ├─ validar Node ≥ 22 y .env
        ├─ mkdir logs
        ├─ npm ci
        ├─ prisma generate
        ├─ npm run build
        ├─ npm prune --omit=dev
        ├─ pm2 start|restart ecosystem.config.cjs --env production
        ├─ pm2 save
        └─ verificar status online
```

Ruta del proyecto: `/home/goadmin-bot/htdocs/bot.goadmintravel.com`

## Componentes

### `deploy.sh`

1. `set -euo pipefail`
2. `cd` al directorio del script
3. Comprobar Node.js ≥ 22
4. Exigir `.env` y presencia de `TELEGRAM_BOT_TOKEN` y `DATABASE_URL` (sin imprimir valores)
5. Crear `logs/`
6. `npm ci`
7. `npx prisma generate`
8. `npm run build`
9. `npm prune --omit=dev`
10. Si PM2 conoce `travel-telegram-bot` → `restart`; si no → `start`, ambos con `--env production`
11. `pm2 save` y `pm2 status`
12. Si el proceso no queda `online`, salir con código ≠ 0 y mensaje con comando de logs

### `ecosystem.config.cjs`

- Nombre: `travel-telegram-bot`
- Script: `dist/index.js`
- `cwd`: `__dirname` (directorio donde vive `ecosystem.config.cjs`, es decir el root del proyecto)
- `instances: 1`, `autorestart: true`, `max_memory_restart: "256M"`
- `env_production`: `NODE_ENV=production`, `LOG_LEVEL=warn`
- Logs: `./logs/error.log`, `./logs/out.log`

Las variables sensibles siguen en `.env`; la app las carga con `dotenv` al arrancar. PM2 solo fuerza producción vía `env_production`.

### `DEPLOY.md`

Actualizar la sección de install/build para documentar `npm ci` → generate → build → `npm prune --omit=dev`, y el uso del script sin `git pull` interno.

## Flujo de datos / entorno

- Entrada: código en el working tree + `.env` existente
- Salida: `dist/` compilado, `node_modules` de producción, proceso PM2 online
- `NODE_ENV=development` en `.env` del servidor queda anulado en runtime por `--env production`

## Manejo de errores

| Condición | Comportamiento |
|-----------|----------------|
| Node &lt; 22 | Abortar con mensaje |
| Falta `.env` o vars críticas | Abortar con mensaje |
| Fallo npm/prisma/build | Abortar por `set -e` |
| PM2 no online tras start/restart | Abortar y sugerir `pm2 logs travel-telegram-bot --err --lines 50` |

## Pruebas / verificación

1. Ejecutar `bash deploy.sh` tras un `git pull` (o sobre el árbol actual)
2. `pm2 status` muestra `travel-telegram-bot` online
3. `pm2 logs travel-telegram-bot --lines 20` sin errores de arranque
4. El bot responde en Telegram (smoke manual)

## Fuera de alcance

- `git pull` automático
- Docker Compose como método principal
- Migraciones Laravel (`telegram_sessions` / `telegram_audit_logs`)
- Reconfiguración de nginx o modo webhook
- Cambiar secretos del `.env`

## Archivos a modificar

- `deploy.sh`
- `ecosystem.config.cjs`
- `DEPLOY.md`
