import type {
  AuthIdentityDTO,
  IAuthModuleService,
  ICustomerModuleService,
  MedusaContainer,
} from "@medusajs/framework/types";
import { generateJwtToken, Modules } from "@medusajs/framework/utils";
import { OTP_AUTH_MODULE } from "../../../modules/otp-auth";
import { OtpAuthService } from "../../../modules/otp-auth/service";
import { OTP_NOTIFICATION_MODULE } from "../../../modules/otp-notification";
import { OtpNotificationService } from "../../../modules/otp-notification/service";

/**
 * Génère un JWT Medusa valide pour un customer.
 * Payload identique à ce que le middleware authenticate("customer") attend.
 */
export function generateCustomerToken(
  authIdentityId: string,
  customerId: string,
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
    },
  );
}

/**
 * Crée un customer Medusa (sans email, phone uniquement) et le lie à l'auth identity.
 * Utilise les modules directement au lieu de createCustomerAccountWorkflow
 * qui exige obligatoirement un email.
 */
async function createAndLinkCustomer(
  scope: MedusaContainer,
  authIdentityId: string,
  phone: string,
): Promise<string> {
  const customerModule: ICustomerModuleService = scope.resolve(
    Modules.CUSTOMER,
  );
  const authModule: IAuthModuleService = scope.resolve(Modules.AUTH);

  // Créer le customer (CreateCustomerDTO n'exige pas d'email au niveau module)
  const [customer] = await customerModule.createCustomers([
    { phone, has_account: true },
  ]);

  // Lier le customer à l'auth identity (pattern identique à setAuthAppMetadataStep)
  const authIdentity = await authModule.retrieveAuthIdentity(authIdentityId);
  await authModule.updateAuthIdentities({
    id: authIdentityId,
    app_metadata: {
      ...(authIdentity.app_metadata ?? {}),
      customer_id: customer.id,
    },
  });

  return customer.id;
}

/**
 * Retourne le customer_id lié à l'auth identity.
 * Si aucun customer n'est encore lié (compte créé avant cette logique),
 * en crée un automatiquement (lazy creation).
 */
export async function getOrCreateLinkedCustomer(
  scope: MedusaContainer,
  authIdentity: AuthIdentityDTO,
  phone: string,
): Promise<string> {
  const customerId = (authIdentity.app_metadata as Record<string, unknown>)
    ?.customer_id as string | undefined;

  if (customerId) return customerId;

  return createAndLinkCustomer(scope, authIdentity.id, phone);
}

/**
 * Crée un nouveau customer lié à une auth identity fraîchement créée.
 * Utilisé par register-pin après l'appel à authModule.register().
 */
export async function createLinkedCustomer(
  scope: MedusaContainer,
  authIdentityId: string,
  phone: string,
): Promise<string> {
  return createAndLinkCustomer(scope, authIdentityId, phone);
}

/**
 * Génère un OTP, l'envoie via le canal demandé, et invalide le code si l'envoi échoue.
 */
export async function generateAndSendOtp(
  scope: MedusaContainer,
  phone: string,
  channel: "sms" | "whatsapp",
): Promise<{ otpId: string }> {
  const otpAuthService: OtpAuthService = scope.resolve(OTP_AUTH_MODULE);
  const notificationService: OtpNotificationService = scope.resolve(
    OTP_NOTIFICATION_MODULE,
  );

  const { code, otpId } = await otpAuthService.generateAndStoreOtp(
    phone,
    channel,
  );

  try {
    if (channel === "whatsapp") {
      await notificationService.sendViaWhatsapp(phone, code);
    } else {
      await notificationService.sendViaSms(phone, code);
    }
  } catch (error) {
    await otpAuthService.updateOtpCodes({ id: otpId }, { used: true });
    throw error;
  }

  return { otpId };
}

/**
 * Vérifie un OTP via le service métier dédié.
 */
export async function verifyOtpCode(
  scope: MedusaContainer,
  phone: string,
  code: string,
): Promise<void> {
  const otpAuthService: OtpAuthService = scope.resolve(OTP_AUTH_MODULE);
  await otpAuthService.verifyOtp(phone, code);
}

export async function authenticatePhone(
  scope: MedusaContainer,
  phone: string,
) {
  const authModule: IAuthModuleService = scope.resolve(Modules.AUTH);

  return authModule.authenticate("phone-otp", {
    body: {
      phone,
    },
  });
}
