import type { BotContext } from "../types.js";
import { requireAuth } from "../middleware/data-scope.js";
import {
  getBookingsByUserId,
  getBookingByReference,
  getBookingGuests,
} from "../services/booking.service.js";
import {
  transformBooking,
  formatBookingMessage,
  formatBookingListItem,
} from "../transformers/booking.transformer.js";
import { formatGuestList } from "../transformers/guest.transformer.js";

export const listBookingsHandler = requireAuth(async (ctx: BotContext) => {
  const bookings = await getBookingsByUserId(ctx.userId!);

  if (!bookings.length) {
    await ctx.reply("📋 No tienes reservaciones registradas.");
    return;
  }

  const lines = [`📋 *Tus reservaciones* (${bookings.length})\n`];

  for (let i = 0; i < bookings.length; i++) {
    lines.push(formatBookingListItem(bookings[i] as any, i));
    if (i < bookings.length - 1) lines.push("");
  }

  lines.push(
    "",
    "_Usa /reservacion [referencia] para ver el detalle completo._"
  );

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
});

export const bookingDetailHandler = requireAuth(async (ctx: BotContext) => {
  const text = ctx.message?.text || "";
  const parts = text.split(/\s+/);
  const reference = parts[1];

  if (!reference) {
    await ctx.reply(
      "Uso: /reservacion [referencia]\n\n" +
        "Ejemplo: `/reservacion RES-00123`\n\n" +
        "Usa /reservaciones para ver tus referencias.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const booking = await getBookingByReference(ctx.userId!, reference);

  if (!booking) {
    await ctx.reply(
      "❌ No se encontró una reservación con esa referencia.\n" +
        "Verifica el código o usa /reservaciones para ver las tuyas."
    );
    return;
  }

  const safe = transformBooking(booking as any);
  const message = formatBookingMessage(safe);

  const guests = await getBookingGuests(ctx.userId!, booking.id);
  const guestSection = guests ? formatGuestList(guests as any) : "";

  const fullMessage = guestSection
    ? `${message}\n\n${guestSection}`
    : message;

  await ctx.reply(fullMessage, { parse_mode: "Markdown" });
});
