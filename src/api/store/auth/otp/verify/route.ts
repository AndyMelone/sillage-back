import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { verifyOtpWorkflow } from "../../../../../workflows/verify-otp"

type VerifyOtpBody = {
  phone?: string
  code?: string
}

/**
 * POST /store/auth/otp/verify
 *
 * Vérifie le code OTP et "connecte" l'utilisateur.
 * 
 * Body : { phone: string, code: string }
 * Response : { message: string, identity: object }
 */
export const POST = async (
  req: MedusaRequest<VerifyOtpBody>,
  res: MedusaResponse
) => {
  const { phone, code } = req.body

  if (!phone || typeof phone !== "string") {
    return res
      .status(400)
      .json({ error: "Le numéro de téléphone est requis." })
  }

  if (!code || typeof code !== "string") {
    return res
      .status(400)
      .json({ error: "Le code de vérification (OTP) est requis." })
  }

  const normalizedPhone = phone.replace(/\s+/g, "")

  try {
    const { result: authIdentity } = await verifyOtpWorkflow(req.scope).run({
      input: { phone: normalizedPhone, code },
    })

    // Dans une implémentation complète Medusa V2, on utiliserait le service d'authentification
    // pour générer un JWT ou créer une session. Ici, on valide l'identité.
    // Vous pouvez ensuite utiliser cet ID pour vos besoins ou appeler /auth/login avec un provider auto-validé.

    return res.json({
      message: "Authentification réussie.",
      identity_id: authIdentity.id,
      entity_id: authIdentity.provider_identities?.[0]?.entity_id
    })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Erreur inconnue"

    if (errMsg.startsWith("OTP_INVALID:")) {
      return res.status(401).json({ error: errMsg.replace("OTP_INVALID:", "") })
    }

    if (errMsg.startsWith("IDENTITY_NOT_FOUND:")) {
        return res.status(404).json({ error: errMsg.replace("IDENTITY_NOT_FOUND:", "") })
    }

    console.error("[OTP Verify Error]", error)
    return res.status(500).json({
      error: "Une erreur est survenue lors de la vérification.",
    })
  }
}
