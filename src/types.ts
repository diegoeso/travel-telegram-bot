import type { Context, SessionFlavor } from "grammy";
import type { ConversationFlavor } from "@grammyjs/conversations";

export interface SessionData {
  userId: number | null;
  isVerified: boolean;
  telegramUsername: string | null;
  verifiedAt: number | null;
}

type BaseContext = Context & SessionFlavor<SessionData> & { userId?: number };

export type BotContext = ConversationFlavor<BaseContext>;

export const PUBLIC_COMMANDS = ["/start", "/ayuda", "/help", "/paquetes", "/verificar"];
