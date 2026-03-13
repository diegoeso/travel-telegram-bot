import { prisma } from "../config/database.js";

export async function getPaymentsByBooking(userId: number, bookingId: number) {
  const booking = await prisma.bookings.findFirst({
    where: { id: BigInt(bookingId), user_id: BigInt(userId), deleted_at: null },
    select: { id: true },
  });

  if (!booking) return null;

  return prisma.payments.findMany({
    where: { booking_id: booking.id },
    orderBy: { no_pay: "asc" },
  });
}

export async function getPaymentsByOrder(userId: number, orderId: number) {
  const order = await prisma.orders.findFirst({
    where: { id: BigInt(orderId), user_id: userId, deleted_at: null },
    select: { id: true },
  });

  if (!order) return null;

  return prisma.payments.findMany({
    where: { order_id: order.id },
    orderBy: { no_pay: "asc" },
  });
}

export async function getAllPaymentsForUser(userId: number) {
  const [userBookings, userOrders] = await Promise.all([
    prisma.bookings.findMany({
      where: { user_id: BigInt(userId), deleted_at: null },
      select: { id: true, booking_reference: true },
    }),
    prisma.orders.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { id: true, order_number: true },
    }),
  ]);

  const bookingIds = userBookings.map((b) => b.id);
  const orderIds = userOrders.map((o) => o.id);

  const [bookingPayments, orderPayments] = await Promise.all([
    bookingIds.length
      ? prisma.payments.findMany({
          where: { booking_id: { in: bookingIds } },
          orderBy: { payment_date: "asc" },
        })
      : [],
    orderIds.length
      ? prisma.payments.findMany({
          where: { order_id: { in: orderIds } },
          orderBy: { payment_date: "asc" },
        })
      : [],
  ]);

  return { bookingPayments, orderPayments };
}

export async function getNextPendingPayment(userId: number) {
  const today = new Date();

  const userBookings = await prisma.bookings.findMany({
    where: { user_id: BigInt(userId), deleted_at: null },
    select: { id: true, booking_reference: true, hotel_id: true },
  });

  if (userBookings.length) {
    const bookingIds = userBookings.map((b) => b.id);
    const payment = await prisma.payments.findFirst({
      where: {
        booking_id: { in: bookingIds },
        status: "1",
        payment_date: { gte: today },
      },
      orderBy: { payment_date: "asc" },
    });

    if (payment) {
      const booking = userBookings.find((b) => b.id === payment.booking_id);
      let hotelName: string | null = null;
      if (booking?.hotel_id) {
        const hotel = await prisma.hotels.findUnique({
          where: { id: booking.hotel_id },
          select: { name: true },
        });
        hotelName = hotel?.name || null;
      }

      return {
        type: "booking" as const,
        payment,
        meta: {
          booking_reference: booking?.booking_reference,
          hotel_name: hotelName,
        },
      };
    }
  }

  const userOrders = await prisma.orders.findMany({
    where: { user_id: userId, deleted_at: null },
    select: { id: true, order_number: true },
  });

  if (userOrders.length) {
    const orderIds = userOrders.map((o) => o.id);
    const payment = await prisma.payments.findFirst({
      where: {
        order_id: { in: orderIds },
        status: "1",
        payment_date: { gte: today },
      },
      orderBy: { payment_date: "asc" },
    });

    if (payment) {
      const order = userOrders.find((o) => o.id === payment.order_id);
      return {
        type: "order" as const,
        payment,
        meta: { order_number: order?.order_number },
      };
    }
  }

  return null;
}
