import type { Conversation } from "@grammyjs/conversations";
import type { BotContext } from "../types.js";
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

type BotConversation = Conversation<BotContext, BotContext>;

export async function supportConversation(
  conversation: BotConversation,
  ctx: BotContext
): Promise<void> {
  if (!ctx.userId) {
    await ctx.reply("🔒 Necesitas verificar tu identidad primero. Usa /verificar.");
    return;
  }

  await ctx.reply(
    "🎫 *Crear ticket de soporte*\n\n" +
      "Describe brevemente tu problema o consulta:",
    { parse_mode: "Markdown" }
  );

  const subjectResponse = await conversation.waitFor("message:text");
  const subject = subjectResponse.message.text.trim();

  if (subject.length < 5) {
    await ctx.reply("❌ La descripción es muy corta. Intenta con /soporte de nuevo.");
    return;
  }

  await ctx.reply(
    "¿Qué prioridad le asignarías?\n\n" +
      "1️⃣ Baja\n" +
      "2️⃣ Media\n" +
      "3️⃣ Alta\n\n" +
      "Escribe *1*, *2* o *3*:",
    { parse_mode: "Markdown" }
  );

  const priorityResponse = await conversation.waitFor("message:text");
  const priorityInput = priorityResponse.message.text.trim();
  const priorityMap: Record<string, number> = { "1": 1, "2": 2, "3": 3 };
  const priorityId = priorityMap[priorityInput] || 2;
  const userId = ctx.userId;

  try {
    const ticketCode = `TG-${Date.now().toString(36).toUpperCase()}`;
    const ticket = await conversation.external(() =>
      prisma.tickets.create({
        data: {
          code: ticketCode,
          title: subject.substring(0, 100),
          description: subject,
          created_by: BigInt(userId!),
          priority_id: BigInt(priorityId),
          status_id: BigInt(1),
          visibility: "public",
        },
      })
    );

    await ctx.reply(
      `✅ *Ticket creado exitosamente*\n\n` +
        `🎫 Ticket #${ticket.id}\n` +
        `📝 ${subject.substring(0, 80)}\n\n` +
        `Nuestro equipo se pondrá en contacto contigo pronto.`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    logger.error("Error creando ticket", { userId, error });
    await ctx.reply(
      "❌ No se pudo crear el ticket. Intenta más tarde o contacta a tu agente directamente."
    );
  }
}
