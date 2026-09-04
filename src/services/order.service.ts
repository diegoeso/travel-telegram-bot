import { prisma } from "../config/database.js";

async function enrichOrder(order: {
  id: bigint;
  package_id: number;
  payment_method_id: number;
  status_id: number;
}) {
  const [pkg, paymentMethod, status] = await Promise.all([
    prisma.packages.findFirst({
      where: { id: BigInt(order.package_id) },
      select: { name: true },
    }),
    prisma.catalog_payment_method.findFirst({
      where: { id: BigInt(order.payment_method_id) },
      select: { name: true },
    }),
    prisma.catalog_order_status.findFirst({
      where: { id: BigInt(order.status_id) },
      select: { name: true },
    }),
  ]);
  return {
    ...order,
    id: Number(order.id),
    package: pkg ? { name: pkg.name } : null,
    paymentMethod: paymentMethod ? { name: paymentMethod.name } : null,
    statusType: status ? { name: status.name } : null,
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
