import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createOrderFulfillmentWorkflow } from "@medusajs/medusa/core-flows";

// Crée la fulfillment pour toutes les commandes non expédiées, sans passer par le formulaire admin (article par article).
export default async function fulfillPendingOrders({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION);

  const [stockLocation] = await stockLocationModuleService.listStockLocations({
    name: "Sillage Dakar Location",
  });
  if (!stockLocation) {
    throw new Error("Stock location 'Sillage Dakar Location' introuvable.");
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "items.*",
      "items.detail.*",
      "fulfillments.id",
    ],
  });

  for (const order of orders) {
    const unfulfilledItems = (order.items ?? [])
      .filter((it) => {
        const fulfilled = it?.detail?.fulfilled_quantity ?? 0;
        return it && it.quantity > fulfilled;
      })
      .map((it) => ({
        id: it!.id,
        quantity: it!.quantity - (it!.detail?.fulfilled_quantity ?? 0),
      }));

    if (unfulfilledItems.length === 0) {
      logger.info(`Commande #${order.display_id} déjà entièrement expédiée.`);
      continue;
    }

    await createOrderFulfillmentWorkflow(container).run({
      input: {
        order_id: order.id,
        items: unfulfilledItems,
        location_id: stockLocation.id,
      },
    });
    logger.info(`Commande #${order.display_id} : fulfillment créée pour ${unfulfilledItems.length} article(s).`);
  }

  logger.info("Terminé.");
}
