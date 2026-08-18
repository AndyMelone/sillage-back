import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
  updateCollectionsWorkflow,
} from "@medusajs/medusa/core-flows";

// Remplace les catégories de démo t-shirt Medusa par les vraies familles olfactives, et ajoute metadata.image partout.

const IMAGE_BY_NAME: Record<string, string> = {
  "Boisé": "/images/collection-woody.jpg",
  "Florale": "/images/collection-floral.jpg",
  "Orientale": "/images/collection-oriental.jpg",
  "Fraîche": "/images/collection-fresh.jpg",
  "Fruité": "/images/featured-perfume.jpg",
  "Cuirée": "/placeholders/perfume-luxury-gold.png",
  "Gourmande": "/placeholders/perfume-vue-2.png",
};

const DESCRIPTION_BY_NAME: Record<string, string> = {
  "Boisé": "La chaleur envoûtante du bois de santal, du cèdre et du vétiver.",
  "Florale": "La délicatesse d'un bouquet de fleurs blanches et de pivoine.",
  "Fruité": "L'énergie pétillante des fruits juteux et des agrumes sucrés.",
};

// Ancien nom (démo t-shirt) -> vrai nom (famille olfactive)
const CATEGORY_RENAME_MAP: Record<string, string> = {
  Shirts: "Boisé",
  Sweatshirts: "Fruité",
  Pants: "Florale",
  Merch: "Orientale",
};

const NEW_CATEGORY_NAMES = ["Fraîche", "Gourmande", "Cuirée"];

export default async function fixPerfumeCategories({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });

  const categoryIdByName = new Map<string, string>();

  for (const cat of existingCategories) {
    const newName = CATEGORY_RENAME_MAP[cat.name];
    if (newName) {
      await updateProductCategoriesWorkflow(container).run({
        input: {
          selector: { id: cat.id },
          update: {
            name: newName,
            metadata: {
              image: IMAGE_BY_NAME[newName],
            },
          },
        },
      });
      categoryIdByName.set(newName, cat.id);
      logger.info(`Catégorie renommée : "${cat.name}" -> "${newName}"`);
    } else {
      categoryIdByName.set(cat.name, cat.id);
    }
  }

  const missingNames = NEW_CATEGORY_NAMES.filter(
    (name) => !categoryIdByName.has(name),
  );
  if (missingNames.length > 0) {
    const { result: created } = await createProductCategoriesWorkflow(
      container,
    ).run({
      input: {
        product_categories: missingNames.map((name) => ({
          name,
          is_active: true,
          metadata: { image: IMAGE_BY_NAME[name] },
        })),
      },
    });
    for (const cat of created) {
      categoryIdByName.set(cat.name, cat.id);
      logger.info(`Catégorie créée : "${cat.name}"`);
    }
  }

  // "Sillage Boisé" pointait vers l'ancienne catégorie "Merch" (renommée "Orientale") au lieu de "Boisé".
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "categories.id", "categories.name"],
    filters: { handle: "sillage-boise" },
  });

  const sillageBoise = products[0];
  const targetCategoryId = categoryIdByName.get("Boisé");
  if (sillageBoise && targetCategoryId) {
    const alreadyCorrect = sillageBoise.categories?.some(
      (c: { id: string } | null) => c?.id === targetCategoryId,
    );
    if (!alreadyCorrect) {
      const productModuleService = container.resolve(Modules.PRODUCT);
      await productModuleService.updateProducts(sillageBoise.id, {
        category_ids: [targetCategoryId],
      });
      logger.info(`Produit "Sillage Boisé" recatégorisé vers "Boisé".`);
    }
  }

  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title", "metadata"],
  });

  for (const col of collections) {
    const image = IMAGE_BY_NAME[col.title];
    if (!image) continue;

    const existingMetadata = (col.metadata as Record<string, unknown>) ?? {};
    if (existingMetadata.image === image) continue;

    await updateCollectionsWorkflow(container).run({
      input: {
        selector: { id: col.id },
        update: {
          metadata: {
            ...existingMetadata,
            image,
            description:
              existingMetadata.description ?? DESCRIPTION_BY_NAME[col.title],
          },
        },
      },
    });
    logger.info(`Image ajoutée sur la collection "${col.title}".`);
  }

  logger.info("Catégories et collections de parfumerie à jour.");
}
