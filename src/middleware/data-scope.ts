import type { NextFunction } from "grammy";
import type { BotContext } from "../types.js";

/**
 * Middleware que garantiza que ctx.userId esté presente
 * para cualquier handler que acceda a datos del usuario.
 * Se usa en handlers individuales como guard clause.
 */
export function requireAuth(
  handler: (ctx: BotContext) => Promise<void>
): (ctx: BotContext) => Promise<void> {
  return async (ctx: BotContext) => {
    if (!ctx.userId) {
      await ctx.reply(
        "🔒 Necesitas verificar tu identidad para usar este comando.\n" +
          "Usa /start para comenzar."
      );
      return;
    }
    return handler(ctx);
  };
}

/**
 * Valida que un recurso pertenece al usuario autenticado.
 * Retorna true si el ownership es válido, false si no.
 */
export function validateOwnership(
  resourceUserId: number | null | undefined,
  sessionUserId: number
): boolean {
  if (!resourceUserId) return false;
  return resourceUserId === sessionUserId;
}
