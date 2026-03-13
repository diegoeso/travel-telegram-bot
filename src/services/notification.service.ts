import { Bot } from "grammy";
import { prisma } from "../config/database.js";
import { formatCurrency, formatDateShort } from "../utils/formatter.js";
import { logger } from "../utils/logger.js";
import type { BotContext } from "../types.js";

export class NotificationService {
  constructor(private bot: Bot<BotContext>) {}

  async notifyPaymentReminder(userId: number): Promise<boolean> {
    const session = await this.findTelegramSession(userId);
    if (!session) return false;

    try {
      const userBookings = await prisma.bookings.findMany({
        where: { user_id: BigInt(userId), deleted_at: null },
        select: { id: true },
      });
      const userOrders = await prisma.orders.findMany({
        where: { user_id: userId, deleted_at: null },
        select: { id: true },
      });

      const bookingIds = userBookings.map((b) => b.id);
      const orderIds = userOrders.map((o) => o.id);

      const nextPayment = await prisma.payments.findFirst({
        where: {
          OR: [
            ...(bookingIds.length ? [{ booking_id: { in: bookingIds } }] : []),
            ...(orderIds.length ? [{ order_id: { in: orderIds } }] : []),
          ],
          status: "1",
        },
        orderBy: { payment_date: "asc" },
      });

      if (!nextPayment) return false;

      await this.bot.api.sendMessage(
        Number(session.telegram_chat_id),
        [
          `🔔 *Recordatorio de pago*`,
          ``,
          `Tienes un pago próximo:`,
          `💵 Monto: ${formatCurrency(nextPayment.amount)}`,
          `📅 Fecha: ${formatDateShort(nextPayment.payment_date)}`,
          `📝 Concepto: ${nextPayment.concept || "Pago de servicio"}`,
          ``,
          `Usa /pagos para ver el detalle completo.`,
        ].join("\n"),
        { parse_mode: "Markdown" }
      );

      logger.info("Notificación de pago enviada", { userId });
      return true;
    } catch (error) {
      logger.error("Error enviando notificación", { userId, error });
      return false;
    }
  }

  async notifyBookingUpdate(
    userId: number,
    bookingRef: string,
    status: string
  ): Promise<boolean> {
    const session = await this.findTelegramSession(userId);
    if (!session) return false;

    try {
      await this.bot.api.sendMessage(
        Number(session.telegram_chat_id),
        [
          `🔔 *Actualización de reservación*`,
          ``,
          `Tu reservación *${bookingRef}* ha cambiado de estado:`,
          `📊 Nuevo estado: *${status}*`,
          ``,
          `Usa /reservacion ${bookingRef} para ver los detalles.`,
        ].join("\n"),
        { parse_mode: "Markdown" }
      );

      return true;
    } catch (error) {
      logger.error("Error enviando notificación de booking", { userId, error });
      return false;
    }
  }

  async notifyPaymentConfirmed(
    userId: number,
    amount: number,
    reference: string
  ): Promise<boolean> {
    const session = await this.findTelegramSession(userId);
    if (!session) return false;

    try {
      await this.bot.api.sendMessage(
        Number(session.telegram_chat_id),
        [
          `✅ *Pago confirmado*`,
          ``,
          `Se ha confirmado tu pago por ${formatCurrency(amount)}`,
          `📋 Referencia: ${reference}`,
          ``,
          `Usa /pagos para ver tu historial completo.`,
        ].join("\n"),
        { parse_mode: "Markdown" }
      );

      return true;
    } catch (error) {
      logger.error("Error enviando confirmación de pago", { userId, error });
      return false;
    }
  }

  private async findTelegramSession(userId: number) {
    try {
      return await prisma.telegram_sessions.findFirst({
        where: { user_id: BigInt(userId), is_verified: true },
        select: { telegram_chat_id: true },
      });
    } catch {
      return null;
    }
  }
}
