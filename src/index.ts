import "dotenv/config";
import { createBot } from "./bot.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { redis } from "./config/redis.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { NotificationService } from "./services/notification.service.js";

async function main(): Promise<void> {
  logger.info("Iniciando Travel Telegram Bot...");
  logger.info(`Modo: ${env.BOT_MODE} | Entorno: ${env.NODE_ENV}`);

  await connectDatabase();

  const bot = createBot();

  // Hacer el servicio de notificaciones disponible globalmente
  const notificationService = new NotificationService(bot);
  (globalThis as any).__notificationService = notificationService;

  if (env.BOT_MODE === "webhook" && env.WEBHOOK_URL) {
    const { default: fastify } = await import("fastify");
    const server = fastify();

    server.get("/health", async () => ({ status: "ok", uptime: process.uptime() }));

    server.post("/telegram/webhook", async (req, reply) => {
      await bot.handleUpdate(req.body as any);
      reply.send({ ok: true });
    });

    await bot.api.setWebhook(`${env.WEBHOOK_URL}/telegram/webhook`);
    await server.listen({ port: env.WEBHOOK_PORT, host: "0.0.0.0" });

    logger.info(`Webhook activo en puerto ${env.WEBHOOK_PORT}`);
  } else {
    await bot.api.deleteWebhook();
    bot.start({
      onStart: () => { logger.info("Bot iniciado en modo polling"); },
    });
  }

  const shutdown = async (signal: string) => {
    logger.info(`Señal ${signal} recibida. Cerrando...`);
    bot.stop();
    await disconnectDatabase();
    redis.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error("Error fatal al iniciar el bot", { error });
  process.exit(1);
});
