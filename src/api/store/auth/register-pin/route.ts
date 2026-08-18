import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { IAuthModuleService } from "@medusajs/framework/types"
import { OTP_AUTH_MODULE } from "../../../../modules/otp-auth"
import { OtpAuthService } from "../../../../modules/otp-auth/service"
import { generateCustomerToken, createLinkedCustomer } from "../_helpers"

type RegisterBody = {
  phone?: string
  otp?: string
}

/**
 * POST /store/auth/register-pin
 *
 * Création de compte (nouveau client).
 * Étapes :
 *  1. Valide le code OTP (envoyé via /otp/send-new-account)
 *  2. Crée l'auth identity (provider phone-otp)
 *  3. Crée le customer Medusa et le lie à l'auth identity
 *  4. Retourne un JWT valide
 *
 * Body : { phone, otp }
 * Response : { token, customer: { id, phone } }
 */
export const POST = async (req: MedusaRequest<RegisterBody>, res: MedusaResponse) => {
  const { phone, otp } = req.body

  if (!phone || !otp) {
    return res.status(400).json({ error: "Les champs phone et otp sont requis." })
  }

  const normalizedPhone = phone.replace(/\s+/g, "")
  if (!/^\+?[0-9]{8,15}$/.test(normalizedPhone)) {
    return res.status(400).json({ error: "Format de numéro de téléphone invalide." })
  }

  const otpAuthService: OtpAuthService = req.scope.resolve(OTP_AUTH_MODULE)

  // Étape 1 : Vérifier l'OTP
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

  const authModule: IAuthModuleService = req.scope.resolve(Modules.AUTH)

  // Étape 2 : Créer l'auth identity
  const authResponse = await authModule.register("phone-otp", {
    body: { phone: normalizedPhone },
  })

  if (!authResponse.success) {
    const isAlreadyExists = authResponse.error?.toLowerCase().includes("existe déjà")
    return res.status(isAlreadyExists ? 409 : 400).json({
      error: authResponse.error || "Impossible de créer le compte.",
    })
  }

  const authIdentity = authResponse.authIdentity!

  // Étape 3 : Créer le customer Medusa et le lier à l'auth identity
  // (createCustomerAccountWorkflow exige un email — on crée directement via les modules)
  const customerId = await createLinkedCustomer(req.scope, authIdentity.id, normalizedPhone)

  // Étape 4 : Générer le JWT
  const token = generateCustomerToken(authIdentity.id, customerId)

  return res.status(201).json({
    token,
    customer: {
      id: customerId,
      phone: normalizedPhone,
    },
  })
}
