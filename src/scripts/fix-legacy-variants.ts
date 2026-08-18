import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

// Les 4 produits restants du seed t-shirt Medusa ont des options vêtement (Size/Color) au lieu de Taille (50ml/100ml).
const TARGET_TITLES = [
  "L'Aube Dorée",
  "Nuit d'Orient",
  "Rosée Matinale",
  "Sillage Boisé",
];

export default async function fixLegacyVariants({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "options.id",
      "options.title",
      "variants.id",
      "variants.title",
      "variants.prices.amount",
      "variants.prices.currency_code",
    ],
    filters: { title: TARGET_TITLES },
  });

  for (const product of products) {
    const firstVariant = product.variants?.[0] as
      | { prices?: { amount: number; currency_code: string }[] }
      | undefined;
    const existingPrice = firstVariant?.prices?.find(
      (p) => p.currency_code === "xof",
    );
    const amount = existingPrice?.amount ?? 85000;

    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: product.id },
        update: {
          options: [{ title: "Taille", values: ["50ml", "100ml"] }],
          variants: [
            {
              title: "50ml",
              options: { Taille: "50ml" },
              prices: [{ amount, currency_code: "xof" }],
            },
            {
              title: "100ml",
              options: { Taille: "100ml" },
              prices: [{ amount, currency_code: "xof" }],
            },
          ],
        },
      },
    });

    logger.info(
      `"${product.title}" : options remplacées par Taille (50ml/100ml) à ${amount} XOF.`,
    );
  }

  logger.info("Variantes corrigées.");
}
