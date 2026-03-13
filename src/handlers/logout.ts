import type { BotContext } from "../types.js";
import { destroySession } from "../middleware/auth.js";

export async function logoutHandler(ctx: BotContext): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  if (!ctx.userId) {
    await ctx.reply("No tienes una sesión activa.");
    return;
  }

  await destroySession(chatId);

  await ctx.reply(
    "👋 Sesión cerrada correctamente.\n\n" +
      "Tu información ya no es accesible desde este chat.\n" +
      "Usa /start para verificar nuevamente."
  );
}
