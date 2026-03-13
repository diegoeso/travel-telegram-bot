# Deployment - Travel Telegram Bot

Guía para desplegar el bot en un VPS de Hostinger con CloudPanel.

---

## Requisitos del servidor

- **Node.js** >= 22.x
- **npm** >= 10.x
- **PM2** (gestor de procesos)
- **Redis** >= 7.x
- **Git**

---

## 1. Preparar el servidor (solo una vez)

Conectarse al servidor por SSH:

```bash
ssh root@tu-ip-del-servidor
```

### 1.1 Instalar Node.js (si no está instalado)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v && npm -v
```

### 1.2 Instalar PM2

```bash
npm install -g pm2
```

### 1.3 Instalar Redis

```bash
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
redis-cli ping  # Debe responder PONG
```

### 1.4 Crear usuario del sistema (opcional pero recomendado)

```bash
useradd -m -s /bin/bash travel-bot
```

### 1.5 Configurar clave SSH para el repositorio

Generar una clave SSH en el servidor para que pueda hacer `git pull` sin contraseña:

```bash
su - travel-bot
ssh-keygen -t ed25519 -C "travel-bot@servidor"
cat ~/.ssh/id_ed25519.pub
```

Copiar la clave pública y agregarla como **Deploy Key** en el repositorio:

- **GitHub**: Repositorio > Settings > Deploy keys > Add deploy key
- **GitLab**: Repositorio > Settings > Repository > Deploy keys

---

## 2. Configuración inicial (primera vez)

### 2.1 Clonar el repositorio

```bash
su - travel-bot
cd ~
git clone git@github.com:tu-usuario/travel-telegram-bot.git app
cd app
```

> Si el repositorio es privado por HTTPS, usar un token de acceso personal:
> ```bash
> git clone https://<TOKEN>@github.com/tu-usuario/travel-telegram-bot.git app
> ```

### 2.2 Crear el archivo de entorno

```bash
cp .env.example .env
nano .env
```

Configurar las variables con los valores de producción:

| Variable | Valor de producción |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token del bot de @BotFather |
| `DATABASE_URL` | `mysql://usuario:password@localhost:3306/tu_base_de_datos` |
| `REDIS_HOST` | `127.0.0.1` |
| `SMTP_*` | Credenciales de tu servidor SMTP |
| `BOT_MODE` | `polling` |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `warn` |
| `SESSION_EXPIRY_HOURS` | `48` (recomendado para producción) |

### 2.3 Ejecutar la migración de Laravel

Las tablas `telegram_sessions` y `telegram_audit_logs` se crean desde el proyecto Laravel. Ejecutar en el servidor donde está el proyecto Laravel:

```bash
cd /ruta/al/proyecto/travel-app
php artisan migrate
```

### 2.4 Instalar dependencias y compilar

```bash
cd ~/app
npm ci --omit=dev
npx prisma generate
npm run build
```

### 2.5 Crear directorio de logs

```bash
mkdir -p ~/logs
```

### 2.6 Iniciar el bot con PM2

```bash
cd ~/app
pm2 start ecosystem.config.cjs --env production
pm2 save
```

### 2.7 Configurar inicio automático

Para que PM2 reinicie el bot si el servidor se reinicia:

```bash
# Ejecutar como root
pm2 startup systemd -u travel-bot --hp /home/travel-bot
# Luego como travel-bot
su - travel-bot
pm2 save
```

---

## 3. Desplegar actualizaciones

Cada vez que haya cambios en el repositorio, conectarse al servidor y ejecutar:

```bash
ssh root@tu-ip-del-servidor
su - travel-bot
cd ~/app
```

### Opción A: Usar el script de deploy

```bash
git pull origin main
bash deploy.sh
```

### Opción B: Manualmente

```bash
git pull origin main
npm ci --omit=dev
npx prisma generate
npm run build
pm2 restart travel-telegram-bot
```

### Deploy rápido (solo cambios en código, sin nuevas dependencias)

```bash
git pull origin main
npm run build
pm2 restart travel-telegram-bot
```

---

## 4. Comandos útiles

### Estado del bot

```bash
pm2 status
pm2 info travel-telegram-bot
```

### Ver logs en tiempo real

```bash
pm2 logs travel-telegram-bot
pm2 logs travel-telegram-bot --lines 100  # Últimas 100 líneas
```

### Detener / Reiniciar

```bash
pm2 stop travel-telegram-bot
pm2 restart travel-telegram-bot
pm2 reload travel-telegram-bot  # Reinicio sin downtime
```

### Monitoreo de recursos

```bash
pm2 monit
```

### Verificar Redis

```bash
redis-cli ping
redis-cli info memory
redis-cli keys "tg:*"  # Ver claves del bot
```

---

## 5. Estructura en el servidor

```
/home/travel-bot/
├── app/                    # Repositorio clonado
│   ├── dist/               # Código compilado (generado)
│   ├── src/                # Código fuente
│   ├── prisma/             # Schema de Prisma
│   ├── node_modules/       # Dependencias (generado)
│   ├── ecosystem.config.cjs
│   ├── deploy.sh
│   ├── package.json
│   └── .env                # Variables de entorno (NO en el repo)
└── logs/                   # Logs de PM2
    ├── error.log
    └── out.log
```

---

## 6. Troubleshooting

### El bot no inicia

```bash
# Revisar logs de error
pm2 logs travel-telegram-bot --err --lines 50

# Verificar variables de entorno
cd ~/app && node -e "require('dotenv').config(); console.log(process.env.TELEGRAM_BOT_TOKEN ? 'Token OK' : 'Token FALTA')"

# Verificar conexión a BD
cd ~/app && node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$connect().then(() => { console.log('DB OK'); p.\$disconnect(); }).catch(e => console.error('DB Error:', e.message));
"
```

### Error de permisos

```bash
chown -R travel-bot:travel-bot /home/travel-bot/app
chown -R travel-bot:travel-bot /home/travel-bot/logs
```

### Redis no conecta

```bash
systemctl status redis-server
systemctl restart redis-server
```

### Puerto en uso (modo webhook)

```bash
lsof -i :3001
kill -9 <PID>
```

### Prisma no genera el cliente correctamente

```bash
cd ~/app
rm -rf node_modules/.prisma
npx prisma generate
npm run build
pm2 restart travel-telegram-bot
```

---

## 7. Consideraciones de seguridad

- El archivo `.env` **nunca** debe estar en el repositorio (ya está en `.gitignore`).
- Usar un usuario de BD con permisos **solo de lectura** para las tablas que el bot consulta, y escritura solo en `telegram_sessions` y `telegram_audit_logs`.
- Configurar un firewall para permitir solo los puertos necesarios:

```bash
ufw allow ssh
ufw allow 80
ufw allow 443
ufw enable
```

- Mantener el servidor actualizado:

```bash
apt update && apt upgrade -y
```

---

## 8. Backup y rollback

### Volver a una versión anterior

```bash
cd ~/app
git log --oneline -5           # Ver últimos commits
git checkout <commit-hash>     # Ir a un commit específico
npm ci --omit=dev
npx prisma generate
npm run build
pm2 restart travel-telegram-bot
```

### Volver a la última versión estable

```bash
cd ~/app
git checkout main
git pull origin main
bash deploy.sh
```

```bash
ssh root@tu-servidor
su - travel-bot
cd ~/app
git pull origin main
bash deploy.sh
```