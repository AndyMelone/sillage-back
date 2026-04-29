import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { authenticatePhonePin, generateAndSendOtp } from "../../_helpers";

type SendOtpBody = {
  phone?: string;
  pin?: string;
  channel?: "sms" | "whatsapp";
};

/**
 * POST /store/auth/otp/send
 *
 * Login existant — étape 2 (après check-phone) :
 *  1. Vérifie le PIN du client
 *  2. Génère et envoie un code OTP (2FA)
 *
 * Body : { phone, pin, channel? }  — channel par défaut : "whatsapp"
 * Response : { message }
 */
export const POST = async (
  req: MedusaRequest<SendOtpBody>,
  res: MedusaResponse,
) => {
  const { phone, pin, channel = "whatsapp" } = req.body;

  if (!phone || typeof phone !== "string") {
    return res
      .status(400)
      .json({ error: "Le numéro de téléphone est requis." });
  }

  if (!pin || typeof pin !== "string") {
    return res
      .status(400)
      .json({ error: "Le code de sécurité (PIN) est requis." });
  }

  if (!["sms", "whatsapp"].includes(channel)) {
    return res
      .status(400)
      .json({ error: 'Le canal doit être "sms" ou "whatsapp".' });
  }

  const normalizedPhone = phone.replace(/\s+/g, "");
  if (!/^\+?[0-9]{8,15}$/.test(normalizedPhone)) {
    return res
      .status(400)
      .json({ error: "Format de numéro de téléphone invalide." });
  }

  try {
    const authResponse = await authenticatePhonePin(
      req.scope,
      normalizedPhone,
      pin,
    );

    if (!authResponse.success) {
      return res.status(401).json({
        error: authResponse.error || "Code PIN incorrect.",
      });
    }

    await generateAndSendOtp(req.scope, normalizedPhone, channel);
    return res.json({ message: "Code de vérification envoyé avec succès." });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Erreur inconnue";

    if (errMsg.startsWith("AUTHENTICATION_FAILED:")) {
      return res
        .status(401)
        .json({ error: errMsg.replace("AUTHENTICATION_FAILED:", "") });
    }
    if (errMsg.startsWith("RATE_LIMIT:")) {
      return res.status(429).json({ error: errMsg.replace("RATE_LIMIT:", "") });
    }

    console.error("[OTP Send Error]", error);
    return res
      .status(500)
      .json({ error: "Impossible d'envoyer le code. Veuillez réessayer." });
  }
};
