import type { BotContext } from "../types.js";
import { prisma } from "../config/database.js";
import { formatCurrency } from "../utils/formatter.js";

export async function packagesHandler(ctx: BotContext): Promise<void> {
  const packages = await prisma.packages.findMany({
    where: {
      is_active: true,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      price: true,
      discount_price: true,
      days: true,
      nights: true,
      adults: true,
      hotel_id: true,
    },
    take: 10,
    orderBy: { is_promoted: "desc" },
  });

  if (!packages.length) {
    await ctx.reply("📦 No hay paquetes disponibles en este momento.");
    return;
  }

  const lines = ["📦 *Paquetes disponibles*\n"];

  for (const pkg of packages) {
    let hotelName = "Varios";
    if (pkg.hotel_id) {
      const hotel = await prisma.hotels.findUnique({
        where: { id: pkg.hotel_id },
        select: { name: true },
      });
      if (hotel) hotelName = hotel.name;
    }

    const hasDiscount =
      pkg.discount_price &&
      Number(pkg.discount_price) > 0 &&
      Number(pkg.discount_price) < Number(pkg.price);

    const priceText = hasDiscount
      ? `~${formatCurrency(pkg.price)}~ ${formatCurrency(pkg.discount_price)}`
      : formatCurrency(pkg.price);

    lines.push(
      `🏖 *${pkg.name}*`,
      `   🏨 ${hotelName}`,
      `   📅 ${pkg.days || "N/A"} días / ${pkg.nights || "N/A"} noches`,
      `   👥 ${pkg.adults || "N/A"} adultos`,
      `   💰 ${priceText}`,
      ""
    );
  }

  lines.push("_Contacta a tu agente para reservar cualquier paquete._");

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
}
