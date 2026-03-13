import { formatDate, formatDateShort, formatCurrency, pluralize } from "../utils/formatter.js";

interface BookingRow {
  id: number;
  booking_reference: string | null;
  confirmation_number: string | null;
  check_in_date: Date | string | null;
  check_out_date: Date | string | null;
  check_in: string | null;
  check_out: string | null;
  nights: number;
  days: number;
  adults: number;
  kids: number;
  juniors: number;
  total_amount: number | string;
  paid_amount: number | string;
  balance_to_pay: number | string;
  currency: string;
  special_requests: string | null;
  nom_rooms: number;
  status?: { name: string; color?: string } | null;
  hotel?: { name: string } | null;
  destination?: { name: string } | null;
  packageType?: { name: string } | null;
}

export interface BookingSafe {
  referencia: string;
  confirmacion: string;
  destino: string;
  hotel: string;
  paquete: string;
  check_in: string;
  check_out: string;
  horario_entrada: string;
  horario_salida: string;
  noches: string;
  habitaciones: number;
  huespedes: string;
  estado: string;
  total: string;
  pagado: string;
  saldo: string;
  solicitudes_especiales: string;
}

export function transformBooking(booking: BookingRow): BookingSafe {
  const guestParts: string[] = [];
  if (booking.adults > 0) guestParts.push(pluralize(booking.adults, "adulto", "adultos"));
  if (booking.kids > 0) guestParts.push(pluralize(booking.kids, "niño", "niños"));
  if (booking.juniors > 0) guestParts.push(pluralize(booking.juniors, "junior", "juniors"));

  return {
    referencia: booking.booking_reference || "Sin referencia",
    confirmacion: booking.confirmation_number || "Pendiente",
    destino: booking.destination?.name || "N/A",
    hotel: booking.hotel?.name || "N/A",
    paquete: booking.packageType?.name || "N/A",
    check_in: formatDate(booking.check_in_date),
    check_out: formatDate(booking.check_out_date),
    horario_entrada: booking.check_in || "Por confirmar",
    horario_salida: booking.check_out || "Por confirmar",
    noches: pluralize(booking.nights, "noche", "noches"),
    habitaciones: booking.nom_rooms,
    huespedes: guestParts.join(", ") || "N/A",
    estado: booking.status?.name || "Desconocido",
    total: formatCurrency(booking.total_amount, booking.currency),
    pagado: formatCurrency(booking.paid_amount, booking.currency),
    saldo: formatCurrency(booking.balance_to_pay, booking.currency),
    solicitudes_especiales: booking.special_requests || "Ninguna",
  };
}

export function formatBookingMessage(safe: BookingSafe): string {
  return [
    `📋 *Reservación ${safe.referencia}*`,
    ``,
    `📍 Destino: ${safe.destino}`,
    `🏨 Hotel: ${safe.hotel}`,
    `📦 Paquete: ${safe.paquete}`,
    ``,
    `📅 Check-in: ${safe.check_in}`,
    `   Horario: ${safe.horario_entrada}`,
    `📅 Check-out: ${safe.check_out}`,
    `   Horario: ${safe.horario_salida}`,
    `🌙 Duración: ${safe.noches}`,
    `🚪 Habitaciones: ${safe.habitaciones}`,
    `👥 Huéspedes: ${safe.huespedes}`,
    ``,
    `📊 Estado: *${safe.estado}*`,
    `💰 Total: ${safe.total}`,
    `✅ Pagado: ${safe.pagado}`,
    `⏳ Saldo: ${safe.saldo}`,
    safe.solicitudes_especiales !== "Ninguna"
      ? `\n📝 Solicitudes: ${safe.solicitudes_especiales}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatBookingListItem(booking: BookingRow, index: number): string {
  return [
    `*${index + 1}.* ${booking.booking_reference || "Sin ref."}`,
    `   🏨 ${booking.hotel?.name || "N/A"} · ${formatDateShort(booking.check_in_date)}`,
    `   Estado: ${booking.status?.name || "N/A"}`,
  ].join("\n");
}
