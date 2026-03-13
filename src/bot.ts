import { Bot } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import type { BotContext } from "./types.js";
import { env } from "./config/env.js";

import { rateLimiterMiddleware } from "./middleware/rate-limiter.js";
import { authMiddleware } from "./middleware/auth.js";
import { auditLogMiddleware } from "./middleware/audit-log.js";

import { authConversation } from "./conversations/auth-flow.js";
import { supportConversation } from "./conversations/support-flow.js";

import { startHandler } from "./handlers/start.js";
import { helpHandler } from "./handlers/help.js";
import { listBookingsHandler, bookingDetailHandler } from "./handlers/booking.js";
import { paymentsHandler, nextPaymentHandler } from "./handlers/payment.js";
import { listOrdersHandler, orderDetailHandler } from "./handlers/order.js";
import { packagesHandler } from "./handlers/packages.js";
import { logoutHandler } from "./handlers/logout.js";

export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);

  // --- Middleware global (orden importa) ---
  bot.use(rateLimiterMiddleware);
  bot.use(auditLogMiddleware);
  bot.use(conversations());

  // --- Registrar conversaciones ---
  bot.use(createConversation(authConversation, "auth"));
  bot.use(createConversation(supportConversation, "support"));

  // --- Auth middleware (después de conversations para que no bloquee /start) ---
  bot.use(authMiddleware);

  // --- Comandos públicos ---
  bot.command("start", startHandler);
  bot.command("ayuda", helpHandler);
  bot.command("help", helpHandler);
  bot.command("paquetes", packagesHandler);

  // --- Comando de verificación (inicia conversación) ---
  bot.command("verificar", async (ctx) => {
    await ctx.conversation.enter("auth");
  });

  // --- Comandos privados (requieren auth) ---
  bot.command("reservaciones", listBookingsHandler);
  bot.command("reservacion", bookingDetailHandler);
  bot.command("pagos", paymentsHandler);
  bot.command("proximo_pago", nextPaymentHandler);
  bot.command("ordenes", listOrdersHandler);
  bot.command("orden", orderDetailHandler);
  bot.command("soporte", async (ctx) => {
    await ctx.conversation.enter("support");
  });
  bot.command("salir", logoutHandler);

  // --- Mensaje no reconocido ---
  bot.on("message:text", async (ctx) => {
    await ctx.reply(
      "No entendí tu mensaje. Usa /ayuda para ver los comandos disponibles."
    );
  });

  // --- Error handler ---
  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error procesando update ${ctx.update.update_id}:`, err.error);
    ctx.reply("⚠️ Ocurrió un error procesando tu solicitud. Intenta de nuevo.").catch(() => {});
  });

  return bot;
}
