import type { BotContext } from "../types.js";

export async function startHandler(ctx: BotContext): Promise<void> {
  if (ctx.userId) {
    await ctx.reply(
      "👋 ¡Ya estás verificado!\n\n" +
        "Usa /ayuda para ver los comandos disponibles.\n" +
        "Si deseas cambiar de cuenta, usa /salir primero.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  await ctx.reply(
    "👋 ¡Bienvenido al bot de *Travel Agency*!\n\n" +
      "Aquí podrás consultar:\n" +
      "📋 Tus reservaciones\n" +
      "💳 Estado de tus pagos\n" +
      "🧾 Tus órdenes\n" +
      "📦 Paquetes disponibles\n\n" +
      "Para acceder a tu información necesitas verificar tu identidad.\n" +
      "Escribe /verificar para comenzar.",
    { parse_mode: "Markdown" }
  );
}
