import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { authenticatePhone, generateAndSendOtp } from "../../_helpers";

type SendOtpBody = {
  phone?: string;
  channel?: "sms" | "whatsapp";
};

/**
 * POST /store/auth/otp/send
 *
 * Génère et envoie un code OTP au numéro fourni.
 * Body : { phone, channel? }  — channel par défaut : "whatsapp"
 * Response : { message }
 */
export const POST = async (
  req: MedusaRequest<SendOtpBody>,
  res: MedusaResponse,
) => {
  const { phone, channel = "whatsapp" } = req.body;

  if (!phone || typeof phone !== "string") {
    return res
      .status(400)
      .json({ error: "Le numéro de téléphone est requis." });
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
    const authResponse = await authenticatePhone(req.scope, normalizedPhone);

    if (!authResponse.success) {
      return res.status(401).json({
        error: authResponse.error || "Aucun compte trouvé pour ce numéro.",
      });
    }

    await generateAndSendOtp(req.scope, normalizedPhone, channel);
    return res.json({ message: "Code de vérification envoyé avec succès." });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Erreur inconnue";

    if (errMsg.startsWith("RATE_LIMIT:")) {
      return res.status(429).json({ error: errMsg.replace("RATE_LIMIT:", "") });
    }

    console.error("[OTP Send Error]", error);
    return res
      .status(500)
      .json({ error: "Impossible d'envoyer le code. Veuillez réessayer." });
  }
};
