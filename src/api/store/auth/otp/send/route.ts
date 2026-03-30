import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendOtpWorkflow } from "../../../../../workflows/send-otp"



type SendOtpBody = {
  phone?: string
  pin?: string
  channel?: "sms" | "whatsapp"
}

/**
 * POST /store/auth/otp/send
 *
 * Déclenche l'envoi d'un code OTP par SMS ou WhatsApp.
 * 1. Vérifie le PIN.
 * 2. Génère, hache et stocke le code OTP.
 * 3. Envoie le code au client.
 */
export const POST = async (
  req: MedusaRequest<SendOtpBody>,
  res: MedusaResponse
) => {
  const { phone, channel, pin } = req.body

  if (!phone || typeof phone !== "string") {
    return res
      .status(400)
      .json({ error: "Le numéro de téléphone est requis." })
  }

  if (!pin || typeof pin !== "string") {
    return res
      .status(400)
      .json({ error: "Le code de sécurité (PIN) est requis." })
  }

  if (!channel || !["sms", "whatsapp"].includes(channel)) {
    return res
      .status(400)
      .json({ error: 'Le canal doit être "sms" ou "whatsapp".' })
  }

  const normalizedPhone = phone.replace(/\s+/g, "")
  if (!/^\+?[0-9]{8,15}$/.test(normalizedPhone)) {
    return res
      .status(400)
      .json({ error: "Format de numéro de téléphone invalide." })
  }

  try {
    await sendOtpWorkflow(req.scope).run({
      input: { phone: normalizedPhone, channel, pin },
    })
    return res.json({
      message: "Code de vérification envoyé avec succès.",
    })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Erreur inconnue"

    if (errMsg.startsWith("AUTHENTICATION_FAILED:")) {
      return res.status(401).json({ error: errMsg.replace("AUTHENTICATION_FAILED:", "") })
    }

    if (errMsg.startsWith("RATE_LIMIT:")) {
      return res.status(429).json({ error: errMsg.replace("RATE_LIMIT:", "") })
    }

    console.error("[OTP Send Error]", error)
    return res.status(500).json({
      error: "Impossible d'envoyer le code. Veuillez réessayer.",
    })
  }
}
