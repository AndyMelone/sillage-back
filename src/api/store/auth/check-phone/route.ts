import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/auth/check-phone
 * 
 * Vérifie si un numéro de téléphone existe déjà dans les identités Auth.
 */
export const POST = async (
  req: MedusaRequest<{ phone: string }>,
  res: MedusaResponse
) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Le numéro de téléphone est requis." });
  }

  const normalizedPhone = phone.replace(/\s+/g, "");
  const query = req.scope.resolve("query");

  try {
    const { data: identities } = await query.graph({
      entity: "auth_identity",
      fields: ["id"],
      filters: {
        provider_identities: {
          entity_id: normalizedPhone,
          provider: "phone-otp"
        }
      }
    });

    const exists = identities.length > 0;
    
    return res.json({
      exists,
      message: exists ? "Compte existant." : "Nouveau compte."
    });
  } catch (error: unknown) {
    console.error("[Check Phone Error]", error);
    return res.status(500).json({ error: "Erreur lors de la vérification du numéro." });
  }
};
