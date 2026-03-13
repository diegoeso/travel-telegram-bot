import Redis from "ioredis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

redis.on("connect", () => {
  logger.info("Conexión a Redis establecida");
});

redis.on("error", (error) => {
  logger.error("Error de Redis", { error: error.message });
});

export const REDIS_KEYS = {
  session: (chatId: number) => `tg:session:${chatId}`,
  otp: (chatId: number) => `tg:otp:${chatId}`,
  rateLimit: (chatId: number) => `tg:rate:${chatId}`,
  otpAttempts: (chatId: number) => `tg:otp_attempts:${chatId}`,
} as const;
