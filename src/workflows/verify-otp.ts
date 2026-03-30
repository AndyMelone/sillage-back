import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { OTP_AUTH_MODULE } from "../modules/otp-auth"
import { OtpAuthService } from "../modules/otp-auth/service"
import { Modules } from "@medusajs/framework/utils"
import { IAuthModuleService } from "@medusajs/framework/types"

type VerifyOtpInput = {
  phone: string
  code: string
}

const verifyOtpStep = createStep(
  "verify-otp-step",
  async (input: VerifyOtpInput, { container }) => {
    const otpAuthService: OtpAuthService = container.resolve(OTP_AUTH_MODULE)

    // On utilise any car les types générés par MedusaService posent souci à la compilation ici
    const isValid = await (otpAuthService as any).verifyOtp(input.phone, input.code)

    if (!isValid) {
       throw new Error("OTP_INVALID:Code incorrect ou expiré.")
    }

    return new StepResponse({ success: true })
  }
)

const getAuthIdentityStep = createStep(
    "get-auth-identity-step",
    async (input: { phone: string }, { container }) => {
        const authModuleService: IAuthModuleService = container.resolve(Modules.AUTH)
        
        const [identity] = await authModuleService.listAuthIdentities({
            provider_identities: {
                entity_id: input.phone
            }
        }, {
            relations: ["provider_identities"]
        })

        if (!identity) {
            throw new Error("IDENTITY_NOT_FOUND:Compte non trouvé après vérification.")
        }

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
