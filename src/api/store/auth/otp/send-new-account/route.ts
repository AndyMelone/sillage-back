import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { sendOtpNoPinWorkflow } from "../../../../../workflows/send-otp-no-pin";

/**
 * POST /store/auth/otp/send-new-account
 */
export const POST = async (
  req: MedusaRequest<{ phone: string; channel: "sms" | "whatsapp" }>,
  res: MedusaResponse
) => {
  const { phone, channel } = req.body;

  if (!phone || !channel) {
    return res.status(400).json({ error: "Phone and channel are required." });
  }

  try {
    await sendOtpNoPinWorkflow(req.scope).run({
      input: { phone, channel }
    });
    return res.json({ message: "OTP sent successfully." });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    if (errMsg.startsWith("RATE_LIMIT:")) {
        return res.status(429).json({ error: errMsg.replace("RATE_LIMIT:", "") });
    }
    return res.status(500).json({ error: "Failed to send OTP." });
  }
};
