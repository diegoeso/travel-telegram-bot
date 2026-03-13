import type { NextFunction } from "grammy";
import type { BotContext } from "../types.js";
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

export async function auditLogMiddleware(
  ctx: BotContext,
  next: NextFunction
): Promise<void> {
  const chatId = ctx.chat?.id;
  const messageText = ctx.message?.text;

  if (!chatId || !messageText) {
    return next();
  }

  const startTime = Date.now();

  await next();

  const duration = Date.now() - startTime;

  try {
    await prisma.telegram_audit_logs.create({
      data: {
        telegram_chat_id: BigInt(chatId),
        user_id: ctx.userId ? BigInt(ctx.userId) : null,
        command: messageText.split(" ")[0] || messageText,
        full_message: messageText.substring(0, 500),
        response_time_ms: duration,
      },
    });
  } catch {
    logger.warn("No se pudo registrar audit log", {
      chatId,
      command: messageText.split(" ")[0],
    });
  }
}
