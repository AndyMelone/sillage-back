import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendOtpNoPinWorkflow } from "../../../../../workflows/send-otp-no-pin"

type SendNewAccountOtpBody = {
  phone?: string
  channel?: "sms" | "whatsapp"
}

/**
 * POST /store/auth/otp/send-new-account
 *
 * Nouveau compte — étape 2 (après check-phone → exists: false) :
 * Envoie un code OTP sans vérification de PIN (le compte n'existe pas encore).
 *
 * Body : { phone, channel? }  — channel par défaut : "whatsapp"
 * Response : { message }
 */
export const POST = async (
  req: MedusaRequest<SendNewAccountOtpBody>,
  res: MedusaResponse
) => {
  const { phone, channel = "whatsapp" } = req.body

  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "Le numéro de téléphone est requis." })
  }

  if (!["sms", "whatsapp"].includes(channel)) {
    return res.status(400).json({ error: 'Le canal doit être "sms" ou "whatsapp".' })
  }

  const normalizedPhone = phone.replace(/\s+/g, "")
  if (!/^\+?[0-9]{8,15}$/.test(normalizedPhone)) {
    return res.status(400).json({ error: "Format de numéro de téléphone invalide." })
  }

  try {
    await sendOtpNoPinWorkflow(req.scope).run({
      input: { phone: normalizedPhone, channel },
    })
    return res.json({ message: "Code de vérification envoyé avec succès." })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Erreur inconnue"

    if (errMsg.startsWith("RATE_LIMIT:")) {
      return res.status(429).json({ error: errMsg.replace("RATE_LIMIT:", "") })
    }

    console.error("[OTP Send New Account Error]", error)
    return res.status(500).json({ error: "Impossible d'envoyer le code. Veuillez réessayer." })
  }
}
