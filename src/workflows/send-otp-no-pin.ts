import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { OTP_AUTH_MODULE } from "../modules/otp-auth";
import { OtpAuthService } from "../modules/otp-auth/service";
import { OTP_NOTIFICATION_MODULE } from "../modules/otp-notification";
import { OtpNotificationService } from "../modules/otp-notification/service";

const generateOtpOnlyStep = createStep(
  "generate-otp-only-step",
  async (input: { phone: string; channel: "sms" | "whatsapp" }, { container }) => {
    const otpAuthService: OtpAuthService = container.resolve(OTP_AUTH_MODULE);

    const { code, otpId } = await otpAuthService.generateAndStoreOtp(
      input.phone,
      input.channel
    );
    
    // Log pour le dev (simule l'envoi)
    console.log(`[OTP DEBUG] Code pour ${input.phone}: ${code}`);

    return new StepResponse(
      { code, otpId, phone: input.phone, channel: input.channel },
      { otpId }
    );
  },
  async ({ otpId }: { otpId: string }, { container }) => {
    const otpAuthService: OtpAuthService = container.resolve(OTP_AUTH_MODULE);
    await otpAuthService.updateOtpCodes({ id: otpId }, { used: true });
  }
);

const sendNotificationStep = createStep(
  "send-notification-step",
  async (
    input: { code: string; phone: string; channel: "sms" | "whatsapp" },
    { container }
  ) => {
    const notificationService: OtpNotificationService =
      container.resolve(OTP_NOTIFICATION_MODULE);

    if (input.channel === "whatsapp") {
      await notificationService.sendViaWhatsapp(input.phone, input.code);
    } else {
      await notificationService.sendViaSms(input.phone, input.code);
    }

    return new StepResponse({ sent: true });
  }
);

export const sendOtpNoPinWorkflow = createWorkflow(
  "send-otp-no-pin",
  (input: { phone: string; channel: "sms" | "whatsapp" }) => {
    const otpData = generateOtpOnlyStep(input);
    const result = sendNotificationStep(otpData);
    return new WorkflowResponse(result);
  }
);
