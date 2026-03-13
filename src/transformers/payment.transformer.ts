import { formatDateShort, formatCurrency } from "../utils/formatter.js";

interface PaymentRow {
  id: number;
  no_pay: number | null;
  amount: number | string;
  paid_amount: number | string | null;
  payment_date: Date | string | null;
  charged_date: Date | string | null;
  concept: string | null;
  status: number | string;
  statusPayment?: { name: string; key?: string } | null;
  paymentMethod?: { name: string } | null;
}

export interface PaymentSafe {
  numero: string;
  monto: string;
  monto_pagado: string;
  fecha_programada: string;
  fecha_cobro: string;
  concepto: string;
  estado: string;
  metodo: string;
}

const STATUS_MAP: Record<string, string> = {
  "1": "Pendiente",
  "3": "Pagado",
  "4": "Rechazado",
  "8": "Link de pago enviado",
};

export function transformPayment(payment: PaymentRow): PaymentSafe {
  const statusStr = String(payment.status);

  return {
    numero: payment.no_pay ? `Pago #${payment.no_pay}` : "Pago",
    monto: formatCurrency(payment.amount),
    monto_pagado: formatCurrency(payment.paid_amount),
    fecha_programada: formatDateShort(payment.payment_date),
    fecha_cobro: payment.charged_date
      ? formatDateShort(payment.charged_date)
      : "Pendiente",
    concepto: payment.concept || "Pago de servicio",
    estado: payment.statusPayment?.name || STATUS_MAP[statusStr] || "Desconocido",
    metodo: payment.paymentMethod?.name || "N/A",
  };
}

export function formatPaymentMessage(safe: PaymentSafe): string {
  return [
    `💳 *${safe.numero}*`,
    ``,
    `💵 Monto: ${safe.monto}`,
    `✅ Pagado: ${safe.monto_pagado}`,
    `📅 Fecha programada: ${safe.fecha_programada}`,
    `📅 Fecha de cobro: ${safe.fecha_cobro}`,
    `📝 Concepto: ${safe.concepto}`,
    `📊 Estado: *${safe.estado}*`,
    `💳 Método: ${safe.metodo}`,
  ].join("\n");
}

export function formatPaymentListItem(payment: PaymentRow, index: number): string {
  const statusStr = String(payment.status);
  const icon = statusStr === "3" ? "✅" : statusStr === "4" ? "❌" : "⏳";

  return [
    `${icon} *Pago #${payment.no_pay || index + 1}*`,
    `   ${formatCurrency(payment.amount)} · ${formatDateShort(payment.payment_date)}`,
    `   Estado: ${payment.statusPayment?.name || STATUS_MAP[statusStr] || "N/A"}`,
  ].join("\n");
}

export interface PaymentSummary {
  total: string;
  pagado: string;
  pendiente: string;
  pagos_realizados: number;
  pagos_pendientes: number;
  pagos_total: number;
}

export function buildPaymentSummary(payments: PaymentRow[], totalAmount?: number): PaymentSummary {
  const paid = payments.filter((p) => String(p.status) === "3");
  const paidSum = paid.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalSum = totalAmount ?? payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    total: formatCurrency(totalSum),
    pagado: formatCurrency(paidSum),
    pendiente: formatCurrency(totalSum - paidSum),
    pagos_realizados: paid.length,
    pagos_pendientes: payments.length - paid.length,
    pagos_total: payments.length,
  };
}

export function formatPaymentSummaryMessage(summary: PaymentSummary): string {
  return [
    `📊 *Resumen de pagos*`,
    ``,
    `💰 Total: ${summary.total}`,
    `✅ Pagado: ${summary.pagado}`,
    `⏳ Pendiente: ${summary.pendiente}`,
    ``,
    `📈 Pagos realizados: ${summary.pagos_realizados}/${summary.pagos_total}`,
  ].join("\n");
}
