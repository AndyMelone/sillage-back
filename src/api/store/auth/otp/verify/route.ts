import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { verifyOtpWorkflow } from "../../../../../workflows/verify-otp"
import {
  generateCustomerToken,
  getOrCreateLinkedCustomer,
} from "../../_helpers"

type VerifyOtpBody = {
  phone?: string
  code?: string
}

/**
 * POST /store/auth/otp/verify
 *
 * Étape finale du login pour les comptes existants.
 * Vérifie le code OTP (2FA après PIN) et retourne un JWT Medusa valide.
 *
 * Body : { phone, code }
 * Response : { token, customer: { id } }
 */
export const POST = async (req: MedusaRequest<VerifyOtpBody>, res: MedusaResponse) => {
  const { phone, code } = req.body

  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "Le numéro de téléphone est requis." })
  }

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Le code de vérification (OTP) est requis." })
  }

  const normalizedPhone = phone.replace(/\s+/g, "")

  try {
    const { result: authIdentity } = await verifyOtpWorkflow(req.scope).run({
      input: { phone: normalizedPhone, code },
    })

    const customerId = await getOrCreateLinkedCustomer(
      req.scope,
      authIdentity,
      normalizedPhone
    )

    const token = generateCustomerToken(authIdentity.id, customerId)

    return res.json({
      token,
      customer: { id: customerId },
    })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Erreur inconnue"

    if (errMsg.startsWith("OTP_INVALID:")) {
      return res.status(401).json({ error: errMsg.replace("OTP_INVALID:", "") })
    }
    if (errMsg.startsWith("OTP_EXPIRED:")) {
      return res.status(401).json({ error: errMsg.replace("OTP_EXPIRED:", "") })
    }
    if (errMsg.startsWith("OTP_MAX_ATTEMPTS:")) {
      return res.status(429).json({ error: errMsg.replace("OTP_MAX_ATTEMPTS:", "") })
    }
    if (errMsg.startsWith("OTP_NOT_FOUND:")) {
      return res.status(404).json({ error: errMsg.replace("OTP_NOT_FOUND:", "") })
    }
    if (errMsg.startsWith("IDENTITY_NOT_FOUND:")) {
      return res.status(404).json({ error: errMsg.replace("IDENTITY_NOT_FOUND:", "") })
    }

    console.error("[OTP Verify Error]", error)
    return res.status(500).json({ error: "Une erreur est survenue lors de la vérification." })
  }
}
