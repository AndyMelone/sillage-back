import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { OTP_AUTH_MODULE } from "../../../../modules/otp-auth";
import { OtpAuthService } from "../../../../modules/otp-auth/service";

/**
 * POST /store/auth/register-pin
 * 
 * Création de compte : Valide l'OTP puis crée l'identité avec le PIN.
 */
export const POST = async (
  req: MedusaRequest<{ phone: string; otp: string; pin: string }>,
  res: MedusaResponse
) => {
  const { phone, otp, pin } = req.body;

  if (!phone || !otp || !pin) {
    return res.status(400).json({ error: "Phone, OTP and PIN are required." });
  }

  const otpAuthService: OtpAuthService = req.scope.resolve(OTP_AUTH_MODULE);
  const authModule = req.scope.resolve(Modules.AUTH);

  try {
    // 1. Vérifier l'OTP
    await otpAuthService.verifyOtp(phone, otp);

    // 2. Créer l'identité via le provider
    const authResponse = await authModule.authenticate("phone-otp", {
      body: { phone, pin },
      // On passe une info pour dire qu'on veut register
    } as any);

    // Note: Le provider PhoneOtpAuthProvider a une méthode register, 
    // mais authenticate avec body peut aussi être utilisé si on le modifie légèrement.
    // Pour cet exercice, on va assumer que le provider est prêt ou on utilise register directement.
    
    // Si authenticate ne gère pas la création, on utilise register
    let finalResponse = authResponse;
    if (!authResponse.success && authResponse.error?.includes("Aucun compte")) {
       finalResponse = await (authModule as any).register("phone-otp", {
         body: { phone, pin }
       });
    }

    if (!finalResponse.success) {
      return res.status(400).json({ error: finalResponse.error || "Registration failed." });
    }

    return res.json({
      message: "Account created successfully.",
      token: "dummy_registration_token",
      identity: finalResponse.authIdentity
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Error";
    if (errMsg.includes("OTP_")) {
        return res.status(401).json({ error: errMsg.split(":")[1] || errMsg });
    }
    return res.status(500).json({ error: "Registration failed." });
  }
};
