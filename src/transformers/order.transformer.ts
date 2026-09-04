import {
  formatDateShort,
  formatCurrency,
  escapeMarkdown,
} from "../utils/formatter.js";

interface OrderRow {
  id: number;
  order_number: string | null;
  total_amount: number | string | null;
  divisa: string;
  no_of_installment: number | null;
  type_payment: string | null;
  schedule_date: Date | string | null;
  status_id: number;
  is_cancelled: boolean;
  cancelled_at: Date | string | null;
  cancelled_reason: string | null;
  created_at: Date | string | null;
  statusType?: { name: string; color?: string } | null;
  package?: { name: string } | null;
  paymentMethod?: { name: string } | null;
}

export interface OrderSafe {
  id: number;
  paquete: string;
  total: string;
  cuotas: string;
  tipo_pago: string;
  metodo_pago: string;
  fecha_inicio: string;
  estado: string;
  cancelada: boolean;
  razon_cancelacion: string;
  fecha_creacion: string;
}

export function transformOrder(order: OrderRow): OrderSafe {
  return {
    id: order.id,
    paquete: order.package?.name || "N/A",
    total: formatCurrency(order.total_amount, order.divisa),
    cuotas: order.no_of_installment
      ? `${order.no_of_installment} cuotas`
      : "Contado",
    tipo_pago: order.type_payment || "N/A",
    metodo_pago: order.paymentMethod?.name || "N/A",
    fecha_inicio: formatDateShort(order.schedule_date),
    estado: order.statusType?.name || "Desconocido",
    cancelada: order.is_cancelled,
    razon_cancelacion: order.cancelled_reason || "",
    fecha_creacion: formatDateShort(order.created_at),
  };
}

export function formatOrderMessage(safe: OrderSafe): string {
  const lines = [
    `🧾 *Orden #${safe.id}*`,
    ``,
    `🏨 Paquete: ${escapeMarkdown(safe.paquete)}`,
    `💰 Total: ${escapeMarkdown(safe.total)}`,
    `📅 Fecha inicio: ${safe.fecha_inicio}`,
    `💳 Método: ${escapeMarkdown(safe.metodo_pago)}`,
    `🔢 Cuotas: ${escapeMarkdown(safe.cuotas)}`,
    `📊 Estado: *${escapeMarkdown(safe.estado)}*`,
    `📆 Creada: ${safe.fecha_creacion}`,
  ];

  if (safe.cancelada) {
    lines.push(``, `❌ *Orden cancelada*`);
    if (safe.razon_cancelacion) {
      lines.push(`   Razón: ${escapeMarkdown(safe.razon_cancelacion)}`);
    }
  }

  lines.push(`Para ver detalles de pagos, usa /pagos\\_orden #${safe.id}`);
  return lines.join("\n");
}

export function formatOrderListItem(order: OrderRow, index: number): string {
  const icon = order.is_cancelled ? "❌" : "🧾";

  return [
    `${icon} *${index + 1}.* Orden #${order.id || "N/A"}`,
    `   ${formatCurrency(order.total_amount, order.divisa)} · ${order.statusType?.name || "N/A"}`,
    `   📦 ${order.package?.name || "N/A"}`,
  ].join("\n");
}
