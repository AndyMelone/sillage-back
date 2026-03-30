import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { OTP_AUTH_MODULE } from "../../../../../modules/otp-auth"
import { OtpAuthService } from "../../../../../modules/otp-auth/service"

type UpdatePinBody = {
  phone?: string
  otp?: string
  current_pin?: string
  new_pin?: string
}

/**
 * POST /store/auth/pin/update
 *
 * Modification du PIN par un client qui connaît son ancien PIN.
 * Double sécurité : OTP + ancien PIN tous deux requis.
 *
 * Body : { phone, otp, current_pin, new_pin }
 */
export const POST = async (
  req: MedusaRequest<UpdatePinBody>,
  res: MedusaResponse
) => {
  const { phone, otp, current_pin, new_pin } = req.body

  if (!phone || !otp || !current_pin || !new_pin) {
    return res.status(400).json({
      error: "Les champs phone, otp, current_pin et new_pin sont requis.",
    })
  }

  if (new_pin.length < 4 || new_pin.length > 8) {
    return res.status(400).json({
      error: "Le nouveau code de sécurité doit contenir entre 4 et 8 chiffres.",
    })
  }

  if (current_pin === new_pin) {
    return res.status(400).json({
      error: "Le nouveau code de sécurité doit être différent de l'ancien.",
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

  // ─── Étape 2 : Valider l'ancien PIN ───────────────────
  const authModule = req.scope.resolve(Modules.AUTH)

  try {
    const verifyResponse = await authModule.authenticate("phone-otp", {
      body: { phone: normalizedPhone, pin: current_pin, otp },
    })

    if (!verifyResponse.success) {
      return res.status(401).json({ error: "Code de sécurité actuel incorrect." })
    }

    // ─── Étape 3 : Mettre à jour le PIN ─────────────────
    // On appelle authenticate avec l'action "update_pin" pour déclencher la mise à jour
    const updateResponse = await authModule.authenticate("phone-otp", {
      body: { phone: normalizedPhone, pin: new_pin, otp, action: "update_pin" },
    })

    if (!updateResponse.success) {
      return res.status(400).json({
        error: updateResponse.error ?? "Impossible de mettre à jour le code de sécurité.",
      })
    }

    return res.json({ message: "Code de sécurité mis à jour avec succès." })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Erreur inconnue."
    console.error("[PIN Update Error]", errMsg)
    return res.status(500).json({ error: "Impossible de mettre à jour le code de sécurité." })
  }
}
