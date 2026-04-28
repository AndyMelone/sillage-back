import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { OTP_AUTH_MODULE } from "../../../../../modules/otp-auth"
import { OtpAuthService } from "../../../../../modules/otp-auth/service"

type UpdatePinBody = {
  otp?: string
  current_pin?: string
  new_pin?: string
}

/**
 * POST /store/auth/pin/update
 *
 * Modification du PIN par un client connecté (JWT requis via middleware).
 * Double sécurité : OTP (envoyé au numéro de téléphone) + ancien PIN.
 * Le téléphone est déduit du JWT, jamais accepté en clair dans le body.
 *
 * Body : { otp, current_pin, new_pin }
 * Response : { message }
 */
export const POST = async (req: AuthenticatedMedusaRequest<UpdatePinBody>, res: MedusaResponse) => {
  const { otp, current_pin, new_pin } = req.body

  if (!otp || !current_pin || !new_pin) {
    return res.status(400).json({
      error: "Les champs otp, current_pin et new_pin sont requis.",
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

  // Récupérer le numéro de téléphone depuis l'identité auth (JWT → auth_identity_id → provider_identity.entity_id)
  const authIdentityId = req.auth_context.auth_identity_id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  let phone: string | undefined
  try {
    const { data: [identityData] } = await query.graph({
      entity: "auth_identity",
      fields: ["provider_identities.entity_id", "provider_identities.provider"],
      filters: { id: authIdentityId },
    })
    phone = identityData?.provider_identities?.find(
      (pi: { provider?: string | null; entity_id?: string | null } | null) =>
        pi?.provider === "phone-otp"
    )?.entity_id ?? undefined
  } catch {
    return res.status(500).json({ error: "Impossible de récupérer les informations du compte." })
  }

  if (!phone) {
    return res.status(400).json({ error: "Aucun numéro de téléphone associé à ce compte." })
  }

  // Étape 1 : Valider l'OTP
  const otpAuthService: OtpAuthService = req.scope.resolve(OTP_AUTH_MODULE)
  try {
    await otpAuthService.verifyOtp(phone, otp)
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

  // Étape 2 : Vérifier l'ancien PIN, puis mettre à jour
  const authModule = req.scope.resolve(Modules.AUTH)

  try {
    // Vérification de l'ancien PIN
    const verifyResponse = await authModule.authenticate("phone-otp", {
      body: { phone, pin: current_pin },
    })

    if (!verifyResponse.success) {
      return res.status(401).json({ error: "Code de sécurité actuel incorrect." })
    }

    // Mise à jour du PIN
    const updateResponse = await authModule.authenticate("phone-otp", {
      body: { phone, pin: new_pin, action: "update_pin" },
    })

    if (!updateResponse.success) {
      return res.status(400).json({
        error: updateResponse.error ?? "Impossible de mettre à jour le code de sécurité.",
      })
    }

    return res.json({ message: "Code de sécurité mis à jour avec succès." })
  } catch (error: unknown) {
    console.error("[PIN Update Error]", error)
    return res.status(500).json({ error: "Impossible de mettre à jour le code de sécurité." })
  }
}
