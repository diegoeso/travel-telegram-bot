import type { BotContext } from "../types.js";
import { requireAuth } from "../middleware/data-scope.js";
import {
  getOrdersByUserId,
  getOrderByNumber,
} from "../services/order.service.js";
import {
  transformOrder,
  formatOrderMessage,
  formatOrderListItem,
} from "../transformers/order.transformer.js";

export const listOrdersHandler = requireAuth(async (ctx: BotContext) => {
  const orders = await getOrdersByUserId(ctx.userId!);

  if (!orders.length) {
    await ctx.reply("🧾 No tienes órdenes registradas.");
    return;
  }

  const lines = [`🧾 *Tus órdenes* (${orders.length})\n`];

  for (let i = 0; i < orders.length; i++) {
    lines.push(formatOrderListItem(orders[i] as any, i));
    if (i < orders.length - 1) lines.push("");
  }

  lines.push("", "_Usa /orden [número] para ver el detalle completo._");

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
});

export const orderDetailHandler = requireAuth(async (ctx: BotContext) => {
  const text = ctx.message?.text || "";
  const parts = text.split(/\s+/);
  const orderNumber = parts[1];

  if (!orderNumber) {
    await ctx.reply(
      "Uso: /orden [número]\n\n" +
        "Ejemplo: `/orden ORD-00456`\n\n" +
        "Usa /ordenes para ver tus números de orden.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const order = await getOrderByNumber(ctx.userId!, orderNumber);

  if (!order) {
    await ctx.reply(
      "❌ No se encontró una orden con ese número.\n" +
        "Verifica el número o usa /ordenes para ver las tuyas."
    );
    return;
  }

  const safe = transformOrder(order as any);
  await ctx.reply(formatOrderMessage(safe), { parse_mode: "Markdown" });
});
