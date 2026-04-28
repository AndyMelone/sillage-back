import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  generateCustomerToken,
  getOrCreateLinkedCustomer,
} from "../_helpers"

type LoginPinBody = {
  phone?: string
  pin?: string
}

/**
 * POST /store/auth/login-pin
 *
 * Login direct par PIN (sans 2FA OTP).
 * Utiliser ce endpoint quand le niveau de sécurité 2FA n'est pas requis.
 * Pour un login avec 2FA : POST /otp/send puis POST /otp/verify.
 *
 * Body : { phone, pin }
 * Response : { token, customer: { id } }
 */
export const POST = async (req: MedusaRequest<LoginPinBody>, res: MedusaResponse) => {
  const { phone, pin } = req.body

  if (!phone || !pin) {
    return res.status(400).json({ error: "Le numéro de téléphone et le code de sécurité sont requis." })
  }

  const normalizedPhone = phone.replace(/\s+/g, "")
  const authModule = req.scope.resolve(Modules.AUTH)

  try {
    const authResponse = await authModule.authenticate("phone-otp", {
      body: { phone: normalizedPhone, pin },
    })

    if (!authResponse.success) {
      return res.status(401).json({ error: authResponse.error || "Identifiants incorrects." })
    }

    const authIdentity = authResponse.authIdentity!

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
    console.error("[Login PIN Error]", error)
    return res.status(500).json({ error: "Authentification impossible." })
  }
}
