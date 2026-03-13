import nodemailer from "nodemailer";
import { prisma } from "../config/database.js";
import { redis, REDIS_KEYS } from "../config/redis.js";
import { env } from "../config/env.js";
import { generateOtp, hashOtp, verifyOtp } from "../utils/otp.js";
import { logger } from "../utils/logger.js";

const MAX_OTP_ATTEMPTS = 3;

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export interface AuthResult {
  success: boolean;
  message: string;
  userId?: number;
}

export async function findCustomerByEmail(email: string) {
  const user = await prisma.users.findFirst({
    where: {
      email: email.toLowerCase().trim(),
      is_customer: true,
      is_active: true,
      deleted_at: null,
    },
    select: { id: true, name: true, email: true },
  });
  if (!user) return null;
  return { id: Number(user.id), name: user.name, email: user.email };
}

export async function findCustomerByPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, "");
  const user = await prisma.users.findFirst({
    where: {
      OR: [{ phone: cleaned }, { mobile: cleaned }],
      is_customer: true,
      is_active: true,
      deleted_at: null,
    },
    select: { id: true, name: true, email: true },
  });
  if (!user) return null;
  return { id: Number(user.id), name: user.name, email: user.email };
}

export async function sendOtp(
  chatId: number,
  email: string,
  userName: string
): Promise<boolean> {
  try {
    const otp = generateOtp();
    const hashed = hashOtp(otp);

    await redis.set(
      REDIS_KEYS.otp(chatId),
      JSON.stringify({ hash: hashed, email }),
      "EX",
      env.OTP_EXPIRY_MINUTES * 60
    );

    await redis.del(REDIS_KEYS.otpAttempts(chatId));

    await transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
      to: email,
      subject: "Código de verificación - Travel Agency Bot",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a73e8;">Código de verificación</h2>
          <p>Hola <strong>${userName}</strong>,</p>
          <p>Tu código de verificación para el bot de Telegram es:</p>
          <div style="background: #f0f4ff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a73e8;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">
            Este código expira en ${env.OTP_EXPIRY_MINUTES} minutos.<br>
            Si no solicitaste este código, ignora este mensaje.
          </p>
        </div>
      `,
    });

    logger.info("OTP enviado", { chatId, email: email.substring(0, 3) + "***" });
    return true;
  } catch (error) {
    logger.error("Error enviando OTP", { chatId, error });
    return false;
  }
}

export async function verifyOtpCode(
  chatId: number,
  inputCode: string
): Promise<AuthResult> {
  const attemptsKey = REDIS_KEYS.otpAttempts(chatId);
  const attempts = parseInt((await redis.get(attemptsKey)) || "0");

  if (attempts >= MAX_OTP_ATTEMPTS) {
    await redis.del(REDIS_KEYS.otp(chatId));
    return {
      success: false,
      message:
        "❌ Has excedido el número máximo de intentos. Usa /start para solicitar un nuevo código.",
    };
  }

  const raw = await redis.get(REDIS_KEYS.otp(chatId));
  if (!raw) {
    return {
      success: false,
      message: "⏰ El código ha expirado. Usa /start para solicitar uno nuevo.",
    };
  }

  const { hash, email } = JSON.parse(raw);

  if (!verifyOtp(inputCode.trim(), hash)) {
    await redis.incr(attemptsKey);
    await redis.expire(attemptsKey, env.OTP_EXPIRY_MINUTES * 60);
    const remaining = MAX_OTP_ATTEMPTS - attempts - 1;
    return {
      success: false,
      message: `❌ Código incorrecto. Te quedan ${remaining} intento(s).`,
    };
  }

  const user = await findCustomerByEmail(email);
  if (!user) {
    return { success: false, message: "❌ Usuario no encontrado." };
  }

  await redis.del(REDIS_KEYS.otp(chatId));
  await redis.del(attemptsKey);

  await saveTelegramLink(chatId, user.id, null);

  return {
    success: true,
    message: `✅ ¡Verificación exitosa! Bienvenido/a, *${user.name || "Cliente"}*.`,
    userId: user.id,
  };
}

async function saveTelegramLink(
  chatId: number,
  userId: number,
  username: string | null
): Promise<void> {
  try {
    await prisma.telegram_sessions.upsert({
      where: { telegram_chat_id: BigInt(chatId) },
      update: {
        user_id: BigInt(userId),
        is_verified: true,
        telegram_username: username,
        last_activity_at: new Date(),
      },
      create: {
        user_id: BigInt(userId),
        telegram_chat_id: BigInt(chatId),
        telegram_username: username,
        is_verified: true,
        last_activity_at: new Date(),
      },
    });
  } catch {
    logger.warn("No se pudo guardar en telegram_sessions");
  }
}
