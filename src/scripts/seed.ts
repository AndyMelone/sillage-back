import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            },
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  },
);

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);
  const regionModuleService = container.resolve(Modules.REGION);
  const taxModuleService = container.resolve(Modules.TAX);
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION);
  const countries = ["sn"];

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Sillage Webshop",
  });

  if (!defaultSalesChannel.length) {
    // create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container,
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Sillage Webshop",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        {
          currency_code: "xof",
          is_default: true,
        },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "Sillage",
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });
  logger.info("Seeding region data...");
  const existingRegions = await regionModuleService.listRegions({
    name: "Senegal",
  });
  let region;
  if (!existingRegions.length) {
    const { result: regionResult } = await createRegionsWorkflow(container).run(
      {
        input: {
          regions: [
            {
              name: "Senegal",
              currency_code: "xof",
              countries,
              payment_providers: ["pp_system_default"],
            },
          ],
        },
      },
    );
    region = regionResult[0];
  } else {
    region = existingRegions[0];
  }
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  const existingTaxRegions = await taxModuleService.listTaxRegions({
    country_code: countries,
  });
  const countriesToCreate = countries.filter(
    (c) => !existingTaxRegions.some((tr) => tr.country_code === c),
  );
  if (countriesToCreate.length) {
    await createTaxRegionsWorkflow(container).run({
      input: countriesToCreate.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    });
  }
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const existingStockLocations =
    await stockLocationModuleService.listStockLocations({
      name: "Sillage Dakar Location",
    });
  let stockLocation;
  if (!existingStockLocations.length) {
    const { result: stockLocationResult } = await createStockLocationsWorkflow(
      container,
    ).run({
      input: {
        locations: [
          {
            name: "Sillage Dakar Location",
            address: {
              city: "Dakar",
              country_code: "SN",
              address_1: "Dakar Plateau",
            },
          },
        ],
      },
    });
    stockLocation = stockLocationResult[0];
  } else {
    stockLocation = existingStockLocations[0];
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Default Shipping Profile",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const existingFulfillmentSets =
    await fulfillmentModuleService.listFulfillmentSets(
      {
        name: "Sillage Dakar Delivery",
      },
      {
        relations: ["service_zones", "service_zones.geo_zones"],
      },
    );
  let fulfillmentSet;
  if (!existingFulfillmentSets.length) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Sillage Dakar Delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Senegal",
          geo_zones: [
            {
              country_code: "sn",
              type: "country",
            },
          ],
        },
      ],
    });
  } else {
    fulfillmentSet = existingFulfillmentSets[0];
  }

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  const existingShippingOptions =
    await fulfillmentModuleService.listShippingOptions({
      name: ["Livraison Standard", "Livraison Express"],
    });
  if (existingShippingOptions.length < 2) {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Livraison Standard",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Livraison en 2-3 jours.",
            code: "standard",
          },
          prices: [
            {
              currency_code: "xof",
              amount: 2500,
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
        {
          name: "Livraison Express",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Express",
            description: "Livraison le jour même ou le lendemain.",
            code: "express",
          },
          prices: [
            {
              currency_code: "xof",
              amount: 85000,
            },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
      ],
    });
  }
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");
  let publishableApiKey: ApiKey | null = null;
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id"],
    filters: {
      type: "publishable",
    },
  });

  publishableApiKey = data?.[0];

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Webshop",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = publishableApiKeyResult as ApiKey;
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding product data...");

  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });

  let categoryResult;
  if (!existingCategories.length) {
    const { result: categoryResultWorkflow } =
      await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: [
            {
              name: "Shirts",
              is_active: true,
            },
            {
              name: "Sweatshirts",
              is_active: true,
            },
            {
              name: "Pants",
              is_active: true,
            },
            {
              name: "Merch",
              is_active: true,
            },
          ],
        },
      });
    categoryResult = categoryResultWorkflow;
  } else {
    categoryResult = existingCategories;
  }

  logger.info("Seeding product collection data...");
  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title"],
  });

  let collectionsResult;
  if (!existingCollections.length) {
    const { result: collectionsResultWorkflow } =
      await createCollectionsWorkflow(container).run({
        input: {
          collections: [
            { title: "Boisé", handle: "boise" },
            { title: "Fruité", handle: "fruite" },
            { title: "Florale", handle: "florale" },
          ],
        },
      });
    collectionsResult = collectionsResultWorkflow;
  } else {
    collectionsResult = existingCollections;
  }

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });

  if (!existingProducts.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: "L'Aube Dorée",
            category_ids: [
              categoryResult.find((cat) => cat.name === "Shirts")!.id,
            ],
            collection_id: collectionsResult.find(
              (col) => col.title === "Boisé",
            )!.id,
            description:
              "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
            handle: "t-shirt",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            metadata: {
              notes_top: "Agrumes, Bergamote, Citron",
              notes_heart: "Jasmin, Rose, Iris",
              notes_base: "Musc, Ambre, Vanille",
              volume: "100ml",
              concentration: "Eau de Parfum",
            },
            images: [
              {
                url: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1000&auto=format&fit=crop",
              },
              {
                url: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=1000&auto=format&fit=crop",
              },
            ],
            options: [
              {
                title: "Size",
                values: ["S", "M", "L", "XL"],
              },
              {
                title: "Color",
                values: ["Black", "White"],
              },
            ],
            variants: [
              {
                title: "S / Black",
                sku: "SHIRT-S-BLACK",
                options: {
                  Size: "S",
                  Color: "Black",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "S / White",
                sku: "SHIRT-S-WHITE",
                options: {
                  Size: "S",
                  Color: "White",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "M / Black",
                sku: "SHIRT-M-BLACK",
                options: {
                  Size: "M",
                  Color: "Black",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "M / White",
                sku: "SHIRT-M-WHITE",
                options: {
                  Size: "M",
                  Color: "White",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "L / Black",
                sku: "SHIRT-L-BLACK",
                options: {
                  Size: "L",
                  Color: "Black",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "L / White",
                sku: "SHIRT-L-WHITE",
                options: {
                  Size: "L",
                  Color: "White",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "XL / Black",
                sku: "SHIRT-XL-BLACK",
                options: {
                  Size: "XL",
                  Color: "Black",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "XL / White",
                sku: "SHIRT-XL-WHITE",
                options: {
                  Size: "XL",
                  Color: "White",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
            ],
            sales_channels: [
              {
                id: defaultSalesChannel[0].id,
              },
            ],
          },
          {
            title: "Nuit d'Orient",
            category_ids: [
              categoryResult.find((cat) => cat.name === "Sweatshirts")!.id,
            ],
            collection_id: collectionsResult.find(
              (col) => col.title === "Fruité",
            )!.id,
            description:
              "Une fragrance envoûtante aux notes orientales, parfaite pour vos soirées les plus mémorables.",
            handle: "nuit-orient",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            metadata: {
              notes_top: "Framboise, Pêche, Cassis",
              notes_heart: "Violette, Gardénia, Fleur d'Oranger",
              notes_base: "Patchouli, Caramel, Santal",
              volume: "100ml",
              concentration: "Eau de Parfum",
            },
            images: [
              {
                url: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1000&auto=format&fit=crop",
              },
              {
                url: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=1000&auto=format&fit=crop",
              },
            ],
            options: [
              {
                title: "Size",
                values: ["S", "M", "L", "XL"],
              },
            ],
            variants: [
              {
                title: "S",
                sku: "SWEATSHIRT-S",
                options: {
                  Size: "S",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "M",
                sku: "SWEATSHIRT-M",
                options: {
                  Size: "M",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "L",
                sku: "SWEATSHIRT-L",
                options: {
                  Size: "L",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "XL",
                sku: "SWEATSHIRT-XL",
                options: {
                  Size: "XL",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
            ],
            sales_channels: [
              {
                id: defaultSalesChannel[0].id,
              },
            ],
          },
          {
            title: "Rosée Matinale",
            category_ids: [
              categoryResult.find((cat) => cat.name === "Pants")!.id,
            ],
            collection_id: collectionsResult.find(
              (col) => col.title === "Florale",
            )!.id,
            description:
              "La fraîcheur d'un matin de printemps capturée dans un flacon délicat et aérien.",
            handle: "rosee-matinale",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            metadata: {
              notes_top: "Pamplemousse, Accord Marin, Mandarine",
              notes_heart: "Laurier, Jasmin, Mousse de Chêne",
              notes_base: "Gaïac, Patchouli, Ambre Gris",
              volume: "100ml",
              concentration: "Eau de Parfum",
            },
            images: [
              {
                url: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=1000&auto=format&fit=crop",
              },
              {
                url: "https://images.unsplash.com/photo-1563170351-be82bc888bb4?q=80&w=1000&auto=format&fit=crop",
              },
            ],
            options: [
              {
                title: "Size",
                values: ["S", "M", "L", "XL"],
              },
            ],
            variants: [
              {
                title: "S",
                sku: "SWEATPANTS-S",
                options: {
                  Size: "S",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "M",
                sku: "SWEATPANTS-M",
                options: {
                  Size: "M",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "L",
                sku: "SWEATPANTS-L",
                options: {
                  Size: "L",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "XL",
                sku: "SWEATPANTS-XL",
                options: {
                  Size: "XL",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
            ],
            sales_channels: [
              {
                id: defaultSalesChannel[0].id,
              },
            ],
          },
          {
            title: "Sillage Boisé",
            category_ids: [
              categoryResult.find((cat) => cat.name === "Merch")!.id,
            ],
            collection_id: collectionsResult.find(
              (col) => col.title === "Boisé",
            )!.id,
            description:
              "Un voyage sensoriel au cœur d'une forêt ancestrale, mêlant force et élégance.",
            handle: "sillage-boise",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            metadata: {
              notes_top: "Cardamome, Poivre Noir, Lavande",
              notes_heart: "Cèdre, Vétiver, Tabac",
              notes_base: "Cuir, Vanille, Fève Tonka",
              volume: "100ml",
              concentration: "Eau de Parfum",
            },
            images: [
              {
                url: "https://images.unsplash.com/photo-1557170334-a9632e77c6e4?q=80&w=1000&auto=format&fit=crop",
              },
              {
                url: "https://images.unsplash.com/photo-1583467875263-d50dec37a88c?q=80&w=1000&auto=format&fit=crop",
              },
            ],
            options: [
              {
                title: "Size",
                values: ["S", "M", "L", "XL"],
              },
            ],
            variants: [
              {
                title: "S",
                sku: "SHORTS-S",
                options: {
                  Size: "S",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "M",
                sku: "SHORTS-M",
                options: {
                  Size: "M",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "L",
                sku: "SHORTS-L",
                options: {
                  Size: "L",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
              {
                title: "XL",
                sku: "SHORTS-XL",
                options: {
                  Size: "XL",
                },
                prices: [
                  {
                    currency_code: "xof",
                    amount: 85000,
                  },
                ],
              },
            ],
            sales_channels: [
              {
                id: defaultSalesChannel[0].id,
              },
            ],
          },
        ],
      },
    });
  }
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const { data: existingInventoryLevels } = await query.graph({
    entity: "inventory_level",
    fields: ["inventory_item_id", "location_id"],
    filters: {
      location_id: stockLocation.id,
    },
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    const alreadyExists = existingInventoryLevels.some(
      (level) => level.inventory_item_id === inventoryItem.id,
    );
    if (!alreadyExists) {
      const inventoryLevel = {
        location_id: stockLocation.id,
        stocked_quantity: 1000000,
        inventory_item_id: inventoryItem.id,
      };
      inventoryLevels.push(inventoryLevel);
    }
  }

  if (inventoryLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: inventoryLevels,
      },
    });
  }

  logger.info("Finished seeding inventory levels data.");
}
