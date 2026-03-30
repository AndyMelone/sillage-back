import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { OTP_AUTH_MODULE } from "../modules/otp-auth"
import { OtpAuthService } from "../modules/otp-auth/service"
import { OTP_NOTIFICATION_MODULE } from "../modules/otp-notification"
import { OtpNotificationService } from "../modules/otp-notification/service"
import { Modules } from "@medusajs/framework/utils"
import { IAuthModuleService } from "@medusajs/framework/types"

const verifyPinStep = createStep(
  "verify-pin-step",
  async (input: { phone: string; pin: string }, { container }) => {
    const authModuleService: IAuthModuleService = container.resolve(Modules.AUTH)

    const response = await authModuleService.authenticate("phone-otp", {
      body: {
        phone: input.phone,
        pin: input.pin,
      },
    } as any)

    if (!response.success) {
      throw new Error(`AUTHENTICATION_FAILED:${response.error || "Identifiants incorrects."}`)
    }

    return new StepResponse({ success: true })
  }
)

type SendOtpInput = {
  phone: string
  pin: string
  channel: "sms" | "whatsapp"
}

const generateOtpStep = createStep(
  "generate-otp-step",
  async (input: SendOtpInput, { container }) => {
    const otpAuthService: OtpAuthService = container.resolve(OTP_AUTH_MODULE)

    const { code, otpId } = await otpAuthService.generateAndStoreOtp(
      input.phone,
      input.channel
    )
    console.log("code", code)
    

    return new StepResponse(
      { code, otpId, phone: input.phone, channel: input.channel },
      { otpId } // données passées à la compensation
    )
  },
  // Compensation : si l'envoi du message échoue, invalider le code en BDD
  async ({ otpId }: { otpId: string }, { container }) => {
    const otpAuthService: OtpAuthService = container.resolve(OTP_AUTH_MODULE)
    await otpAuthService.updateOtpCodes({ id: otpId }, { used: true })
  }
)

const sendNotificationStep = createStep(
  "send-notification-step",
  async (
    input: { code: string; phone: string; channel: "sms" | "whatsapp" },
    { container }
  ) => {
    const notificationService: OtpNotificationService =
      container.resolve(OTP_NOTIFICATION_MODULE)

    if (input.channel === "whatsapp") {
      await notificationService.sendViaWhatsapp(input.phone, input.code)
    } else {
      await notificationService.sendViaSms(input.phone, input.code)
    }

    return new StepResponse({ sent: true })
  }
)

export const sendOtpWorkflow = createWorkflow(
  "send-otp",
  (input: SendOtpInput) => {
    verifyPinStep({ phone: input.phone, pin: input.pin })
    const otpData = generateOtpStep(input)
    const result = sendNotificationStep(otpData)
    return new WorkflowResponse(result)
  }
)
