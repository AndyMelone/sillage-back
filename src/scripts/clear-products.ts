import { ExecArgs } from "@medusajs/types"
import { Modules } from "@medusajs/utils"

export default async function clearData({ container }: ExecArgs) {
  const productModuleService = container.resolve(Modules.PRODUCT)
  
  const products = await productModuleService.listProducts({}, { select: ["id"] })
  if (products.length) {
    await productModuleService.deleteProducts(products.map(p => p.id))
    console.log(`Deleted ${products.length} products`)
  }

  const collections = await productModuleService.listProductCollections({}, { select: ["id"] })
  if (collections.length) {
    await productModuleService.deleteProductCollections(collections.map(c => c.id))
    console.log(`Deleted ${collections.length} collections`)
  }

  const categories = await productModuleService.listProductCategories({}, { select: ["id"] })
  if (categories.length) {
    await productModuleService.deleteProductCategories(categories.map(c => c.id))
    console.log(`Deleted ${categories.length} categories`)
  }

  const inventoryModuleService = container.resolve(Modules.INVENTORY)
  const inventoryItems = await inventoryModuleService.listInventoryItems({}, { select: ["id"] })
  if (inventoryItems.length) {
    await inventoryModuleService.deleteInventoryItems(inventoryItems.map(i => i.id))
    console.log(`Deleted ${inventoryItems.length} inventory items`)
  }
}
