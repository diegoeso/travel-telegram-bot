import type { Conversation } from "@grammyjs/conversations";
import type { BotContext } from "../types.js";

type BotConversation = Conversation<BotContext, BotContext>;
import {
  findCustomerByEmail,
  findCustomerByPhone,
  sendOtp,
  verifyOtpCode,
} from "../services/auth.service.js";
import { saveSession } from "../middleware/auth.js";
import { maskEmail } from "../utils/masker.js";
import { env } from "../config/env.js";

export async function authConversation(
  conversation: BotConversation,
  ctx: BotContext
): Promise<void> {
  await ctx.reply(
    "🔐 *Verificación de identidad*\n\n" +
      "¿Cómo deseas verificarte?\n\n" +
      "1️⃣ Con mi *email* registrado\n" +
      "2️⃣ Con mi *teléfono* registrado\n\n" +
      "Escribe *1* o *2*:",
    { parse_mode: "Markdown" }
  );

  const methodResponse = await conversation.waitFor("message:text");
  const method = methodResponse.message.text.trim();

  if (method !== "1" && method !== "2") {
    await ctx.reply("Opción no válida. Usa /start para intentar de nuevo.");
    return;
  }

  let user: { id: number; name: string | null; email: string } | null = null;

  if (method === "1") {
    await ctx.reply("📧 Escribe tu email registrado:");
    const emailResponse = await conversation.waitFor("message:text");
    const email = emailResponse.message.text.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await ctx.reply("❌ Email no válido. Usa /start para intentar de nuevo.");
      return;
    }

    user = await conversation.external(() => findCustomerByEmail(email));
  } else {
    await ctx.reply("📱 Escribe tu número de teléfono (10 dígitos):");
    const phoneResponse = await conversation.waitFor("message:text");
    const phone = phoneResponse.message.text.trim();

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      await ctx.reply("❌ Número no válido. Usa /start para intentar de nuevo.");
      return;
    }

    user = await conversation.external(() => findCustomerByPhone(phone));
  }

  if (!user) {
    await ctx.reply(
      "❌ No encontramos una cuenta con esos datos.\n" +
        "Verifica que estés usando el mismo email/teléfono registrado con tu agencia."
    );
    return;
  }

  const maskedEmail = maskEmail(user.email);
  await ctx.reply(
    `✅ Cuenta encontrada. Enviaremos un código de verificación a:\n\`${maskedEmail}\``,
    { parse_mode: "Markdown" }
  );

  const chatId = ctx.chat!.id;
  const sent = await conversation.external(() =>
    sendOtp(chatId, user!.email, user!.name || "Cliente")
  );

  if (!sent) {
    await ctx.reply(
      "❌ Error al enviar el código. Intenta de nuevo con /start."
    );
    return;
  }

  await ctx.reply(
    `📬 Código enviado. Tienes *${env.OTP_EXPIRY_MINUTES} minutos*.\n\n` +
      "Escribe el código de 6 dígitos:",
    { parse_mode: "Markdown" }
  );

  const codeResponse = await conversation.waitFor("message:text");
  const code = codeResponse.message.text.trim();

  if (!/^\d{6}$/.test(code)) {
    await ctx.reply("❌ El código debe ser de 6 dígitos. Usa /start para reintentar.");
    return;
  }

  const result = await conversation.external(() =>
    verifyOtpCode(chatId, code)
  );

  if (!result.success) {
    await ctx.reply(result.message, { parse_mode: "Markdown" });
    return;
  }

  await conversation.external(() =>
    saveSession(chatId, result.userId!, ctx.from?.username || null)
  );

  await ctx.reply(
    result.message +
      "\n\n" +
      "Ahora puedes usar estos comandos:\n" +
      "📋 /reservaciones - Ver tus reservaciones\n" +
      "💳 /pagos - Ver tus pagos\n" +
      "🧾 /ordenes - Ver tus órdenes\n" +
      "📦 /paquetes - Paquetes disponibles\n" +
      "❓ /ayuda - Lista de comandos\n" +
      "🚪 /salir - Cerrar sesión",
    { parse_mode: "Markdown" }
  );
}
