import { model } from "@medusajs/framework/utils"

/**
 * Représente un code OTP stocké en base de données.
 * - Le code est hashé (bcrypt) avant stockage — jamais stocké en clair.
 * - Expire après 5 minutes.
 * - Invalidé après 5 tentatives incorrectes (anti-bruteforce).
 * - Marqué comme utilisé après validation réussie.
 */
export const OtpCode = model.define("otp_code", {
  id: model.id().primaryKey(),
  phone: model.text().index("idx_otp_code_phone"),
  hashed_code: model.text(),
  channel: model.enum(["sms", "whatsapp"]),
  expires_at: model.dateTime(),
  attempts: model.number().default(0),
  used: model.boolean().default(false),
})
