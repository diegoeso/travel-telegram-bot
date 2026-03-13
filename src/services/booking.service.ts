import { prisma } from "../config/database.js";

function toNum(val: bigint | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  return Number(val);
}

async function enrichBooking(booking: any) {
  const [hotel, destination, packageType] = await Promise.all([
    booking.hotel_id
      ? prisma.hotels.findUnique({ where: { id: booking.hotel_id }, select: { name: true } })
      : null,
    booking.destination_id
      ? prisma.destinations.findUnique({ where: { id: booking.destination_id }, select: { name: true } })
      : null,
    booking.package_type_id
      ? prisma.package_types.findUnique({ where: { id: booking.package_type_id }, select: { name: true } })
      : null,
  ]);

  return {
    ...booking,
    id: Number(booking.id),
    hotel: hotel ? { name: hotel.name } : null,
    destination: destination ? { name: destination.name } : null,
    packageType: packageType ? { name: packageType.name } : null,
    status: null,
  };
}

export async function getBookingsByUserId(userId: number) {
  const bookings = await prisma.bookings.findMany({
    where: { user_id: BigInt(userId), deleted_at: null },
    orderBy: { check_in_date: "desc" },
    take: 10,
  });

  return Promise.all(bookings.map(enrichBooking));
}

export async function getBookingByReference(userId: number, reference: string) {
  const booking = await prisma.bookings.findFirst({
    where: {
      user_id: BigInt(userId),
      booking_reference: reference.trim(),
      deleted_at: null,
    },
  });

  if (!booking) return null;
  return enrichBooking(booking);
}

export async function getBookingById(userId: number, bookingId: number) {
  const booking = await prisma.bookings.findFirst({
    where: {
      id: BigInt(bookingId),
      user_id: BigInt(userId),
      deleted_at: null,
    },
  });

  if (!booking) return null;
  return enrichBooking(booking);
}

export async function getActiveBookings(userId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookings = await prisma.bookings.findMany({
    where: {
      user_id: BigInt(userId),
      deleted_at: null,
      check_out_date: { gte: today },
    },
    orderBy: { check_in_date: "asc" },
  });

  return Promise.all(bookings.map(enrichBooking));
}

export async function getBookingGuests(userId: number, bookingId: number) {
  const booking = await prisma.bookings.findFirst({
    where: { id: BigInt(bookingId), user_id: BigInt(userId), deleted_at: null },
    select: { id: true },
  });

  if (!booking) return null;

  const guests = await prisma.guests.findMany({
    where: { booking_id: booking.id },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      document_type: true,
      document_number: true,
      birth_date: true,
      type: true,
      is_main_guest: true,
    },
    orderBy: [{ is_main_guest: "desc" }, { first_name: "asc" }],
  });

  return guests;
}
