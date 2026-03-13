import { maskDocument } from "../utils/masker.js";

interface GuestRow {
  id: number;
  first_name: string;
  last_name: string;
  document_type: string | null;
  document_number: string | null;
  birth_date: Date | string | null;
  type: string | null;
  is_main_guest: boolean;
}

export interface GuestSafe {
  nombre: string;
  tipo: string;
  documento: string;
  es_titular: boolean;
}

const TYPE_MAP: Record<string, string> = {
  adult: "Adulto",
  kid: "Niño",
  junior: "Junior",
};

export function transformGuest(guest: GuestRow): GuestSafe {
  return {
    nombre: `${guest.first_name} ${guest.last_name}`,
    tipo: TYPE_MAP[guest.type || ""] || "N/A",
    documento: guest.document_number
      ? maskDocument(guest.document_number)
      : "N/A",
    es_titular: guest.is_main_guest,
  };
}

export function formatGuestMessage(safe: GuestSafe): string {
  const badge = safe.es_titular ? " 👑" : "";
  return `👤 ${safe.nombre}${badge} · ${safe.tipo} · Doc: ${safe.documento}`;
}

export function formatGuestList(guests: GuestRow[]): string {
  if (!guests.length) return "No hay huéspedes registrados.";

  const sorted = [...guests].sort(
    (a, b) => (b.is_main_guest ? 1 : 0) - (a.is_main_guest ? 1 : 0)
  );

  const lines = sorted.map((g) => {
    const safe = transformGuest(g);
    return formatGuestMessage(safe);
  });

  return [`*Huéspedes:*`, ...lines].join("\n");
}
