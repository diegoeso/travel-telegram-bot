import crypto from "node:crypto";

export function generateOtp(length: number = 6): string {
  const digits = "0123456789";
  let otp = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
}

export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function verifyOtp(input: string, hashed: string): boolean {
  const inputHash = hashOtp(input);
  return crypto.timingSafeEqual(
    Buffer.from(inputHash),
    Buffer.from(hashed)
  );
}
