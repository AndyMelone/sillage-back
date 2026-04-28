import { generateJwtToken, Modules } from "@medusajs/framework/utils"
import type {
  AuthIdentityDTO,
  IAuthModuleService,
  ICustomerModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"

/**
 * Génère un JWT Medusa valide pour un customer.
 * Payload identique à ce que le middleware authenticate("customer") attend.
 */
export function generateCustomerToken(
  authIdentityId: string,
  customerId: string
): string {
  return generateJwtToken(
    {
      actor_id: customerId,
      actor_type: "customer",
      auth_identity_id: authIdentityId,
      app_metadata: {
        customer_id: customerId,
        roles: [],
      },
      user_metadata: {},
    },
    {
      secret: process.env.JWT_SECRET || "supersecret",
      expiresIn: "30d",
    }
  )
}

/**
 * Crée un customer Medusa (sans email, phone uniquement) et le lie à l'auth identity.
 * Utilise les modules directement au lieu de createCustomerAccountWorkflow
 * qui exige obligatoirement un email.
 */
async function createAndLinkCustomer(
  scope: MedusaContainer,
  authIdentityId: string,
  phone: string
): Promise<string> {
  const customerModule: ICustomerModuleService = scope.resolve(Modules.CUSTOMER)
  const authModule: IAuthModuleService = scope.resolve(Modules.AUTH)

  // Créer le customer (CreateCustomerDTO n'exige pas d'email au niveau module)
  const [customer] = await customerModule.createCustomers([
    { phone, has_account: true },
  ])

  // Lier le customer à l'auth identity (pattern identique à setAuthAppMetadataStep)
  const authIdentity = await authModule.retrieveAuthIdentity(authIdentityId)
  await authModule.updateAuthIdentities({
    id: authIdentityId,
    app_metadata: {
      ...(authIdentity.app_metadata ?? {}),
      customer_id: customer.id,
    },
  })

  return customer.id
}

/**
 * Retourne le customer_id lié à l'auth identity.
 * Si aucun customer n'est encore lié (compte créé avant cette logique),
 * en crée un automatiquement (lazy creation).
 */
export async function getOrCreateLinkedCustomer(
  scope: MedusaContainer,
  authIdentity: AuthIdentityDTO,
  phone: string
): Promise<string> {
  const customerId = (authIdentity.app_metadata as Record<string, unknown>)
    ?.customer_id as string | undefined

  if (customerId) return customerId

  return createAndLinkCustomer(scope, authIdentity.id, phone)
}

/**
 * Crée un nouveau customer lié à une auth identity fraîchement créée.
 * Utilisé par register-pin après l'appel à authModule.register().
 */
export async function createLinkedCustomer(
  scope: MedusaContainer,
  authIdentityId: string,
  phone: string
): Promise<string> {
  return createAndLinkCustomer(scope, authIdentityId, phone)
}
