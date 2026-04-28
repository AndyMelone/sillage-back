import { ExecArgs } from "@medusajs/types"
import { Modules } from "@medusajs/utils"

export default async function getKeys({ container }: ExecArgs) {
  const query = container.resolve("query")
  const { data: apiKeys } = await query.graph({
    entity: "api_key",
    fields: ["token", "title"],
    filters: {
      type: "publishable",
    },
  })

  console.log("PUBLISHABLE_KEYS:")
  console.log(JSON.stringify(apiKeys, null, 2))
}
