import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows";

// Ajoute l'option "Je récupère en boutique" (0 XOF) si elle n'existe pas déjà (type.code === "pickup").
export default async function addPickupShippingOption({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  const existing = await fulfillmentModuleService.listShippingOptions({
    name: "Je récupère en boutique",
  });
  if (existing.length > 0) {
    logger.info("L'option de retrait en boutique existe déjà, rien à faire.");
    return;
  }

  const fulfillmentSets = await fulfillmentModuleService.listFulfillmentSets(
    { name: "Sillage Dakar Delivery" },
    { relations: ["service_zones"] },
  );
  const fulfillmentSet = fulfillmentSets[0];
  if (!fulfillmentSet) {
    throw new Error("Fulfillment set 'Sillage Dakar Delivery' introuvable.");
  }

  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  const shippingProfile = shippingProfiles[0];
  if (!shippingProfile) {
    throw new Error("Shipping profile par défaut introuvable.");
  }

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Je récupère en boutique",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Retrait en boutique",
          description: "À récupérer directement au showroom Sillage.",
          code: "pickup",
        },
        prices: [
          {
            currency_code: "xof",
            amount: 0,
          },
        ],
        rules: [
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });

  logger.info("Option 'Je récupère en boutique' (0 XOF) créée avec succès.");
}
