# Travel Telegram Bot

Bot de Telegram para autoservicio de clientes de la agencia de viajes. Permite consultar reservaciones, pagos, órdenes y paquetes disponibles de forma segura.

## Stack

- **Runtime**: Node.js + TypeScript
- **Bot Framework**: grammY
- **ORM**: Prisma (conectado a la misma BD de travel-app)
- **Cache/Sesiones**: Redis (ioredis)
- **Validación**: Zod

## Requisitos

- Node.js 22+
- Redis
- Acceso a la base de datos de travel-app (MySQL)
- Token de bot de Telegram (crear con [@BotFather](https://t.me/BotFather))

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Generar cliente Prisma
# Opción A: introspeccionar BD existente (recomendado)
npx prisma db pull
npx prisma generate

# Opción B: usar schema incluido
npx prisma generate

# 4. Ejecutar migración en travel-app (tablas nuevas del bot)
cd /ruta/a/travel-app
php artisan migrate
```

## Ejecución

```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm run build
npm start

# Docker
docker compose up -d
```

## Migración Laravel

Se incluye una migración en `travel-app/database/migrations/` que crea:

- `telegram_sessions` — vincula usuarios con su cuenta de Telegram
- `telegram_audit_logs` — registro de cada comando ejecutado

## Seguridad

| Capa | Descripción |
|------|-------------|
| Rate Limiting | Max 30 req/min por usuario |
| Autenticación OTP | Código de 6 dígitos enviado por email |
| Data Scoping | Toda query filtrada por `user_id` |
| Ownership Validation | Verificación de propiedad de cada recurso |
| Transformers | Solo campos permitidos llegan al chat |
| Audit Log | Cada interacción registrada en BD |
| Session Expiry | Sesiones expiran automáticamente |

## Comandos del bot

| Comando | Requiere auth | Descripción |
|---------|:---:|-------------|
| `/start` | No | Bienvenida |
| `/verificar` | No | Verificar identidad (OTP) |
| `/paquetes` | No | Paquetes disponibles |
| `/ayuda` | No | Lista de comandos |
| `/reservaciones` | Sí | Listar reservaciones |
| `/reservacion [ref]` | Sí | Detalle de reservación |
| `/pagos` | Sí | Resumen de pagos |
| `/proximo_pago` | Sí | Próximo pago pendiente |
| `/ordenes` | Sí | Listar órdenes |
| `/orden [num]` | Sí | Detalle de orden |
| `/soporte` | Sí | Crear ticket de soporte |
| `/salir` | Sí | Cerrar sesión |

## Estructura

```
src/
├── config/          # Conexiones (DB, Redis, env)
├── middleware/       # Auth, rate limit, audit
├── handlers/         # Comandos del bot
├── conversations/    # Flujos interactivos (auth, soporte)
├── services/         # Lógica de acceso a datos
├── transformers/     # Filtrado de datos sensibles
├── utils/            # Formateo, enmascarado, OTP
├── bot.ts            # Configuración de grammY
├── index.ts          # Entry point
└── types.ts          # Tipos compartidos
```
