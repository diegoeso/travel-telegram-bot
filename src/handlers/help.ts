import type { BotContext } from "../types.js";

export function buildHelpMessage(isVerified: boolean): string {
  const publicCommands = [
    "/start - Iniciar el bot",
    "/verificar - Verificar tu identidad",
    "/paquetes - Ver paquetes disponibles",
    "/ayuda - Este menú de ayuda",
  ];

  const privateCommands = [
    "",
    "*📋 Reservaciones*",
    "/reservaciones - Listar mis reservaciones",
    "/reservacion [referencia] - Detalle de una reservación",
    "",
    "*💳 Pagos*",
    "/pagos - Resumen de mis pagos",
    "/proximo\\_pago - Mi próximo pago pendiente",
    "/pagos\\_orden [ID] - Pagos de una orden",
    "",
    "*🧾 Órdenes*",
    "/ordenes - Listar mis órdenes",
    "/orden [número] - Detalle de una orden",
    "",
    "*🎫 Soporte*",
    "/soporte - Crear ticket de soporte",
    "",
    "*🔒 Sesión*",
    "/salir - Cerrar sesión",
  ];

  const lines = ["🤖 *Comandos disponibles*\n", ...publicCommands];

  if (isVerified) {
    lines.push(...privateCommands);
  } else {
    lines.push(
      "",
      "_Verifica tu identidad con /verificar para acceder a más comandos._",
    );
  }

  return lines.join("\n");
}

export async function helpHandler(ctx: BotContext): Promise<void> {
  await ctx.reply(buildHelpMessage(!!ctx.userId), { parse_mode: "Markdown" });
}
