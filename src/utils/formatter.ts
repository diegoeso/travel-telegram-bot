import dayjs from "dayjs";
import "dayjs/locale/es.js";
import localizedFormat from "dayjs/plugin/localizedFormat.js";

dayjs.extend(localizedFormat);
dayjs.locale("es");

export function formatDate(date: string | Date | null): string {
  if (!date) return "Sin fecha";
  return dayjs(date).format("dddd, D [de] MMMM [de] YYYY");
}

export function formatDateShort(date: string | Date | null): string {
  if (!date) return "N/A";
  return dayjs(date).format("DD/MM/YYYY");
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return "N/A";
  return dayjs(date).format("DD/MM/YYYY HH:mm");
}

export function formatCurrency(
  amount: number | string | { toNumber(): number } | null | undefined,
  currency: string = "MXN"
): string {
  if (amount === null || amount === undefined) return "$0.00";
  const num =
    typeof amount === "string"
      ? parseFloat(amount)
      : typeof amount === "number"
        ? amount
        : amount.toNumber();
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}

/** Escapa _, *, ` y [ para el Markdown clásico de Telegram. */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[])/g, "\\$1");
}
