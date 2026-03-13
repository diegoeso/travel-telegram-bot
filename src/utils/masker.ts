/**
 * Enmascara un email: j****@gmail.com
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***.***";
  const visible = local.charAt(0);
  return `${visible}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}

/**
 * Enmascara un teléfono: ******4589
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "**********";
  const last4 = phone.slice(-4);
  return `${"*".repeat(phone.length - 4)}${last4}`;
}

/**
 * Enmascara un documento: ****1234
 */
export function maskDocument(doc: string): string {
  if (!doc || doc.length < 4) return "********";
  const last4 = doc.slice(-4);
  return `${"*".repeat(doc.length - 4)}${last4}`;
}

/**
 * Enmascara un número de tarjeta: **** **** **** 4242
 */
export function maskCardNumber(cardNumber: string): string {
  if (!cardNumber || cardNumber.length < 4) return "**** **** **** ****";
  const last4 = cardNumber.slice(-4);
  return `**** **** **** ${last4}`;
}

/**
 * Enmascara un RFC: ABC*******X0
 */
export function maskRfc(rfc: string): string {
  if (!rfc || rfc.length < 5) return "***********";
  const first3 = rfc.slice(0, 3);
  const last2 = rfc.slice(-2);
  return `${first3}${"*".repeat(rfc.length - 5)}${last2}`;
}
