import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { OTP_AUTH_MODULE } from "../../../../../modules/otp-auth"
import { OtpAuthService } from "../../../../../modules/otp-auth/service"

type ResetPinBody = {
  phone?: string
  otp?: string
  new_pin?: string
}

/**
 * POST /store/auth/pin/reset
 *
 * PIN oublié : Valide l'OTP puis met à jour le PIN du compte.
 * Ne requiert PAS l'ancien PIN (flux "mot de passe oublié").
 *
 * Body : { phone, otp, new_pin }
 */
export const POST = async (
  req: MedusaRequest<ResetPinBody>,
  res: MedusaResponse
) => {
  const { phone, otp, new_pin } = req.body

  // ─── Validation ───────────────────────────────────────
  if (!phone || !otp || !new_pin) {
    return res.status(400).json({
      error: "Les champs phone, otp et new_pin sont requis.",
    })
  }

  if (new_pin.length < 4 || new_pin.length > 8) {
    return res.status(400).json({
      error: "Le nouveau code de sécurité doit contenir entre 4 et 8 chiffres.",
    })
  }

  const normalizedPhone = phone.replace(/\s+/g, "")

  // ─── Étape 1 : Valider l'OTP ───────────────────────────
  const otpAuthService: OtpAuthService = req.scope.resolve(OTP_AUTH_MODULE)
  try {
    await otpAuthService.verifyOtp(normalizedPhone, otp)
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "OTP_INVALID:Code invalide."
    const [code, message] = errMsg.split(":")
    const statusMap: Record<string, number> = {
      OTP_NOT_FOUND: 404,
      OTP_EXPIRED: 401,
      OTP_INVALID: 401,
      OTP_MAX_ATTEMPTS: 429,
    }
    return res.status(statusMap[code] ?? 400).json({ error: message ?? errMsg })
  }

  // ─── Étape 2 : Appeler register (réinitialise le PIN via le provider) ──
  // On utilise le provider directement avec l'action "reset"
  const authModule = req.scope.resolve(Modules.AUTH)

  try {
    // Pour réinitialiser, on appelle register qui va mettre à jour le hash du PIN
    // Le provider phone-otp gère le cas où l'identité existe déjà
    const authResponse = await authModule.authenticate("phone-otp", {
      body: { phone: normalizedPhone, pin: new_pin, otp, action: "reset" },
    })

    if (!authResponse.success) {
      return res.status(400).json({
        error: authResponse.error ?? "Impossible de réinitialiser le code de sécurité.",
      })
    }

    return res.json({ message: "Code de sécurité réinitialisé avec succès." })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Erreur inconnue."
    console.error("[PIN Reset Error]", errMsg)
    return res.status(500).json({ error: "Impossible de réinitialiser le code de sécurité." })
  }
}
