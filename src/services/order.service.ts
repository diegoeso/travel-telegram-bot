import { prisma } from "../config/database.js";

async function enrichOrder(order: any) {
  let packageName: string | null = null;
  if (order.package_id) {
    const pkg = await prisma.packages.findFirst({
      where: { id: BigInt(order.package_id) },
      select: { name: true },
    });
    packageName = pkg?.name || null;
  }

  return {
    ...order,
    id: Number(order.id),
    package: packageName ? { name: packageName } : null,
    statusType: null,
    paymentMethod: null,
  };
}

export async function getOrdersByUserId(userId: number) {
  const orders = await prisma.orders.findMany({
    where: { user_id: userId, deleted_at: null },
    orderBy: { created_at: "desc" },
    take: 10,
  });

  return Promise.all(orders.map(enrichOrder));
}

export async function getOrderByNumber(userId: number, orderNumber: string) {
  const order = await prisma.orders.findFirst({
    where: {
      user_id: userId,
      order_number: orderNumber.trim(),
      deleted_at: null,
    },
  });

  if (!order) return null;
  return enrichOrder(order);
}

export async function getOrderById(userId: number, orderId: number) {
  const order = await prisma.orders.findFirst({
    where: {
      id: BigInt(orderId),
      user_id: userId,
      deleted_at: null,
    },
  });

  if (!order) return null;
  return enrichOrder(order);
}

export async function getActiveOrders(userId: number) {
  const orders = await prisma.orders.findMany({
    where: {
      user_id: userId,
      deleted_at: null,
      is_cancelled: false,
    },
    orderBy: { created_at: "desc" },
  });

  return Promise.all(orders.map(enrichOrder));
}
