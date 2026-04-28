import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { OTP_AUTH_MODULE } from "../modules/otp-auth"
import { OtpAuthService } from "../modules/otp-auth/service"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { IAuthModuleService } from "@medusajs/framework/types"

type VerifyOtpInput = {
  phone: string
  code: string
}

const verifyOtpStep = createStep(
  "verify-otp-step",
  async (input: VerifyOtpInput, { container }) => {
    const otpAuthService: OtpAuthService = container.resolve(OTP_AUTH_MODULE)
    await otpAuthService.verifyOtp(input.phone, input.code)
    return new StepResponse({ success: true })
  }
)

/**
 * Cherche l'auth identity via le query service (filtre sur provider_identities confirmé
 * fonctionnel), puis récupère l'objet complet (avec app_metadata) via l'auth module.
 */
const getAuthIdentityStep = createStep(
  "get-auth-identity-step",
  async (input: { phone: string }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: results } = await query.graph({
      entity: "auth_identity",
      fields: ["id"],
      filters: {
        provider_identities: {
          entity_id: input.phone,
          provider: "phone-otp",
        },
      },
    })

    if (!results.length) {
      throw new Error("IDENTITY_NOT_FOUND:Compte non trouvé.")
    }

    const authModuleService: IAuthModuleService = container.resolve(Modules.AUTH)
    const identity = await authModuleService.retrieveAuthIdentity(results[0].id)

    return new StepResponse(identity)
  }
)

export const verifyOtpWorkflow = createWorkflow(
  "verify-otp",
  (input: VerifyOtpInput) => {
    verifyOtpStep(input)
    const identity = getAuthIdentityStep({ phone: input.phone })
    return new WorkflowResponse(identity)
  }
)
