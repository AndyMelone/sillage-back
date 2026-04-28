import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/auth/login-pin
 *
 * Authentification simple par PIN pour les comptes existants.
 */
export const POST = async (
  req: MedusaRequest<{ phone: string; pin: string }>,
  res: MedusaResponse,
) => {
  const { phone, pin } = req.body;

  if (!phone || !pin) {
    return res.status(400).json({ error: "Phone and PIN are required." });
  }

  const authModule = req.scope.resolve(Modules.AUTH);

  try {
    const authResponse = await authModule.authenticate("phone-otp", {
      body: { phone, pin },
    });

    if (!authResponse.success) {
      return res
        .status(401)
        .json({ error: authResponse.error || "Invalid credentials." });
    }

    // Ici on devrait normalement retourner un token JWT Medusa
    // Pour simplifier l'intégration actuelle :
    return res.json({
      message: "Login successful.",
      token: "dummy_token_for_now", // À remplacer par un vrai token si configuré
      identity: authResponse.authIdentity,
    });
  } catch (error: unknown) {
    return res.status(500).json({ error: "Authentication failed." });
  }
};
