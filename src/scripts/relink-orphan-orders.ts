import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

// Réattribue au vrai customer_id (via le téléphone de livraison) les commandes pré-fix attachées à un client invité fantôme.
export default async function relinkOrphanOrders({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const orderModuleService = container.resolve(Modules.ORDER);

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "customer_id",
      "shipping_address.phone",
    ],
  });

  for (const order of orders) {
    const phone = order.shipping_address?.phone;
    if (!phone) continue;

    const { data: realCustomers } = await query.graph({
      entity: "customer",
      fields: ["id", "has_account"],
      filters: { phone },
    });

    const realCustomer = realCustomers.find((c) => c.has_account);
    if (!realCustomer) continue;

    if (order.customer_id === realCustomer.id) {
      logger.info(`Commande #${order.display_id} déjà correctement liée.`);
      continue;
    }

    await orderModuleService.updateOrders(order.id, {
      customer_id: realCustomer.id,
    });
    logger.info(
      `Commande #${order.display_id} réattribuée : ${order.customer_id} -> ${realCustomer.id}`,
    );
  }

  logger.info("Terminé.");
}
