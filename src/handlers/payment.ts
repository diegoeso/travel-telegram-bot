import type { BotContext } from "../types.js";
import { requireAuth } from "../middleware/data-scope.js";
import {
  getAllPaymentsForUser,
  getNextPendingPayment,
} from "../services/payment.service.js";
import {
  transformPayment,
  formatPaymentMessage,
  formatPaymentListItem,
  buildPaymentSummary,
  formatPaymentSummaryMessage,
} from "../transformers/payment.transformer.js";
import { formatCurrency, formatDateShort } from "../utils/formatter.js";

export const paymentsHandler = requireAuth(async (ctx: BotContext) => {
  const { bookingPayments, orderPayments } = await getAllPaymentsForUser(
    ctx.userId!
  );

  const allPayments = [...bookingPayments, ...orderPayments];

  if (!allPayments.length) {
    await ctx.reply("💳 No tienes pagos registrados.");
    return;
  }

  const summary = buildPaymentSummary(allPayments as any);
  const summaryMsg = formatPaymentSummaryMessage(summary);

  const lines = [summaryMsg, ""];

  if (bookingPayments.length > 0) {
    lines.push("*Pagos de reservaciones:*", "");
    for (let i = 0; i < Math.min(bookingPayments.length, 5); i++) {
      const p = bookingPayments[i] as any;
      lines.push(formatPaymentListItem(p, i));
      if (i < Math.min(bookingPayments.length, 5) - 1) lines.push("");
    }
    if (bookingPayments.length > 5) {
      lines.push(`\n_... y ${bookingPayments.length - 5} pagos más_`);
    }
  }

  if (orderPayments.length > 0) {
    lines.push("", "*Pagos de órdenes:*", "");
    for (let i = 0; i < Math.min(orderPayments.length, 5); i++) {
      const p = orderPayments[i] as any;
      lines.push(formatPaymentListItem(p, i));
      if (i < Math.min(orderPayments.length, 5) - 1) lines.push("");
    }
    if (orderPayments.length > 5) {
      lines.push(`\n_... y ${orderPayments.length - 5} pagos más_`);
    }
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
});

export const nextPaymentHandler = requireAuth(async (ctx: BotContext) => {
  const result = await getNextPendingPayment(ctx.userId!);

  if (!result) {
    await ctx.reply("✅ ¡No tienes pagos pendientes próximos! Todo al día.");
    return;
  }

  const safe = transformPayment(result.payment as any);
  const message = formatPaymentMessage(safe);

  const source =
    result.type === "booking"
      ? `📋 Reservación: ${result.meta.booking_reference || "N/A"}`
      : `🧾 Orden: ${result.meta.order_number || "N/A"}`;

  await ctx.reply(`⏰ *Próximo pago pendiente*\n\n${source}\n\n${message}`, {
    parse_mode: "Markdown",
  });
});
