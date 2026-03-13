import type { NextFunction } from "grammy";
import type { BotContext } from "../types.js";
import { redis, REDIS_KEYS } from "../config/redis.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { PUBLIC_COMMANDS } from "../types.js";

interface StoredSession {
  userId: number;
  isVerified: boolean;
  telegramUsername: string | null;
  verifiedAt: number;
}

export async function authMiddleware(
  ctx: BotContext,
  next: NextFunction
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const messageText = ctx.message?.text?.trim() || "";
  const isPublicCommand = PUBLIC_COMMANDS.some((cmd) =>
    messageText.startsWith(cmd)
  );

  if (isPublicCommand) {
    await tryLoadSession(ctx, chatId);
    return next();
  }

  const session = await loadSession(chatId);

  if (!session || !session.isVerified) {
    await ctx.reply(
      "🔒 Necesitas verificar tu identidad primero.\n\n" +
        "Usa /start para iniciar el proceso de verificación."
    );
    return;
  }

  const expiryMs = env.SESSION_EXPIRY_HOURS * 60 * 60 * 1000;
  if (Date.now() - session.verifiedAt > expiryMs) {
    await redis.del(REDIS_KEYS.session(chatId));
    await ctx.reply(
      "⏰ Tu sesión ha expirado. Usa /start para verificar nuevamente."
    );
    return;
  }

  ctx.userId = session.userId;

  await redis.expire(
    REDIS_KEYS.session(chatId),
    env.SESSION_EXPIRY_HOURS * 60 * 60
  );

  return next();
}

async function loadSession(chatId: number): Promise<StoredSession | null> {
  try {
    const raw = await redis.get(REDIS_KEYS.session(chatId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch (error) {
    logger.error("Error cargando sesión", { chatId, error });
    return null;
  }
}

async function tryLoadSession(ctx: BotContext, chatId: number): Promise<void> {
  const session = await loadSession(chatId);
  if (session?.isVerified) {
    ctx.userId = session.userId;
  }
}

export async function saveSession(
  chatId: number,
  userId: number,
  telegramUsername: string | null
): Promise<void> {
  const session: StoredSession = {
    userId,
    isVerified: true,
    telegramUsername,
    verifiedAt: Date.now(),
  };

  await redis.set(
    REDIS_KEYS.session(chatId),
    JSON.stringify(session),
    "EX",
    env.SESSION_EXPIRY_HOURS * 60 * 60
  );

  logger.info("Sesión guardada", { chatId, userId });
}

export async function destroySession(chatId: number): Promise<void> {
  await redis.del(REDIS_KEYS.session(chatId));
  logger.info("Sesión destruida", { chatId });
}
