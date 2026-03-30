import { MedusaService } from "@medusajs/framework/utils"
import { OtpCode } from "./models/otp_code"
import * as bcrypt from "bcrypt"

type CreateOtpResult = {
  code: string // Le code en clair (pour l'envoyer par SMS/WhatsApp)
  otpId: string
}

/**
 * Service principal de gestion des OTP.
 * Responsabilités :
 *  - Générer un code à 6 chiffres, le hasher et le stocker en BDD
 *  - Vérifier un code soumis (expiration, bruteforce, déjà utilisé)
 *  - Gérer le PIN (code de sécurité) des clients
 */
export class OtpAuthService extends MedusaService({
  otpCode: OtpCode,
}) {
  private readonly SALT_ROUNDS = 10
  private readonly OTP_TTL_MINUTES = 5
  private readonly MAX_ATTEMPTS = 5
  private readonly RESEND_COOLDOWN_SECONDS = 60

  /**
   * Génère un code OTP à 6 chiffres, le hash et le stocke.
   * Invalide les OTP précédents du même numéro.
   * Retourne le code EN CLAIR pour l'envoyer par message.
   */
  async generateAndStoreOtp(
    phone: string,
    channel: "sms" | "whatsapp"
  ): Promise<CreateOtpResult> {
    // Invalider les anciens OTP pour ce numéro
    const existingOtps = await this.listOtpCodes({ phone, used: false })
    for (const existing of existingOtps) {
      // Vérification anti-spam : refuser si un OTP a été envoyé il y a moins de 60s
      const createdAt = new Date(existing.created_at as unknown as string)
      const secondsSinceCreation =
        (Date.now() - createdAt.getTime()) / 1000
      if (secondsSinceCreation < this.RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(
          this.RESEND_COOLDOWN_SECONDS - secondsSinceCreation
        )
        throw new Error(
          `RATE_LIMIT:Veuillez réessayer dans ${waitSeconds} secondes.`
        )
      }

      // Invalider les anciens OTP
      await this.updateOtpCodes({ id: existing.id }, { used: true })
    }

    // Générer le code en clair (6 chiffres)
    const plainCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString()

    // Hacher le code avant de le stocker
    const hashedCode = await bcrypt.hash(plainCode, this.SALT_ROUNDS)

    // Calculer la date d'expiration (maintenant + 5 min)
    const expiresAt = new Date(
      Date.now() + this.OTP_TTL_MINUTES * 60 * 1000
    )

    const otp = await this.createOtpCodes({
      phone,
      hashed_code: hashedCode,
      channel,
      expires_at: expiresAt,
      attempts: 0,
      used: false,
    })

    return { code: plainCode, otpId: otp.id }
  }

  /**
   * Vérifie un code OTP soumis par l'utilisateur.
   * Gère les cas : expiré, max tentatives atteint, déjà utilisé.
   */
  async verifyOtp(phone: string, submittedCode: string): Promise<boolean> {
    // Récupérer le dernier OTP valide pour ce numéro
    const otps = await this.listOtpCodes(
      { phone, used: false },
      { order: { created_at: "DESC" }, take: 1 }
    )

    if (!otps || otps.length === 0) {
      throw new Error("OTP_NOT_FOUND:Aucun code OTP trouvé pour ce numéro.")
    }

    const otp = otps[0]

    // Vérifier si max tentatives atteint (anti-bruteforce)
    if (otp.attempts >= this.MAX_ATTEMPTS) {
      await this.updateOtpCodes({ id: otp.id }, { used: true })
      throw new Error(
        "OTP_MAX_ATTEMPTS:Trop de tentatives. Veuillez demander un nouveau code."
      )
    }

    // Vérifier si le code est expiré
    if (new Date() > new Date(otp.expires_at as unknown as string)) {
      await this.updateOtpCodes({ id: otp.id }, { used: true })
      throw new Error("OTP_EXPIRED:Ce code a expiré. Veuillez en demander un nouveau.")
    }

    // Vérifier le code (comparaison hash bcrypt)
    const isValid = await bcrypt.compare(submittedCode, otp.hashed_code)

    if (!isValid) {
      // Incrémenter le compteur de tentatives
      await this.updateOtpCodes(
        { id: otp.id },
        { attempts: otp.attempts + 1 }
      )
      const remaining = this.MAX_ATTEMPTS - (otp.attempts + 1)
      throw new Error(
        `OTP_INVALID:Code incorrect. Il vous reste ${remaining} tentative(s).`
      )
    }

    // Marquer comme utilisé (OTP à usage unique)
    await this.updateOtpCodes({ id: otp.id }, { used: true })
    return true
  }
}
