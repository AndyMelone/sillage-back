import {
  AbstractAuthModuleProvider,
} from "@medusajs/framework/utils"
import {
  AuthIdentityProviderService,
  AuthenticationInput,
  AuthenticationResponse,
} from "@medusajs/framework/types"

// Les données custom (phone, otp) transitent via `input.body`, conformément à AuthenticationInput de Medusa.
export class PhoneOtpAuthProvider extends AbstractAuthModuleProvider {
  static identifier = "phone-otp"
  static DISPLAY_NAME = "Phone + OTP Authentication"

  // Le PIN n'est plus requis (téléphone + OTP valide suffisent) ; un `hashed_pin` résiduel en base est ignoré.
  async authenticate(
    input: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const { phone } = (input.body ?? {}) as Record<string, string>

    if (!phone) {
      return { success: false, error: "Le numéro de téléphone est requis." }
    }

    try {
      const authIdentity = await authIdentityProviderService.retrieve({
        entity_id: phone,
      })
      return { success: true, authIdentity }
    } catch {
      return { success: false, error: "Aucun compte trouvé pour ce numéro de téléphone." }
    }
  }

  // Inscription identifiée uniquement par le numéro de téléphone (plus de PIN à créer).
  async register(
    input: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const { phone } = (input.body ?? {}) as Record<string, string>

    if (!phone) {
      return { success: false, error: "Le numéro de téléphone est requis." }
    }

    // Vérifier que le compte n'existe pas déjà
    try {
      await authIdentityProviderService.retrieve({ entity_id: phone })
      return { success: false, error: "Un compte existe déjà pour ce numéro de téléphone." }
    } catch {
      // Normal : le compte n'existe pas encore, on peut continuer
    }

    const authIdentity = await authIdentityProviderService.create({
      entity_id: phone,
      provider_metadata: {},
    })

    return { success: true, authIdentity }
  }
}
