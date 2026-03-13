import type { NextFunction } from "grammy";
import type { BotContext } from "../types.js";
import { redis, REDIS_KEYS } from "../config/redis.js";
import { env } from "../config/env.js";

export async function rateLimiterMiddleware(
  ctx: BotContext,
  next: NextFunction
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const key = REDIS_KEYS.rateLimit(chatId);
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.pexpire(key, env.RATE_LIMIT_WINDOW_MS);
  }

  if (current > env.RATE_LIMIT_MAX) {
    const ttl = await redis.pttl(key);
    const secondsLeft = Math.ceil(ttl / 1000);

    await ctx.reply(
      `⚠️ Has enviado demasiados mensajes. Espera ${secondsLeft} segundos antes de intentar de nuevo.`
    );
    return;
  }

  return next();
}
