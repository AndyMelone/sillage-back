import {
  AbstractAuthModuleProvider,
} from "@medusajs/framework/utils"
import {
  AuthIdentityProviderService,
  AuthenticationInput,
  AuthenticationResponse,
} from "@medusajs/framework/types"
import * as bcrypt from "bcrypt"

/**
 * Fournisseur d'authentification personnalisé pour Medusa V2.
 * Les données custom (phone, otp, pin) transitent via `input.body`
 * conformément à la signature AuthenticationInput de Medusa.
 */
export class PhoneOtpAuthProvider extends AbstractAuthModuleProvider {
  static identifier = "phone-otp"
  static DISPLAY_NAME = "Phone + OTP Authentication"

  private readonly SALT_ROUNDS = 10

  /**
   * Authentification d'un client existant.
   * Vérifie le PIN haché stocké dans provider_metadata.
   */
  async authenticate(
    input: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const { phone, pin, action } = (input.body ?? {}) as Record<string, string>

    if (!phone || !pin) {
      return { success: false, error: "Le numéro de téléphone et le code de sécurité sont requis." }
    }

    let authIdentity
    try {
      authIdentity = await authIdentityProviderService.retrieve({
        entity_id: phone,
      })
    } catch {
      return { success: false, error: "Aucun compte trouvé pour ce numéro de téléphone." }
    }

    const providerIdentity = authIdentity.provider_identities?.find(
      (pi) => pi.provider === PhoneOtpAuthProvider.identifier
    )

    // Si on demande un reset ou un update, on court-circuite la vérification habituelle
    if (action === "reset" || action === "update_pin") {
      try {
        const hashedPin = await bcrypt.hash(pin, this.SALT_ROUNDS)
        const existingMeta = (providerIdentity?.provider_metadata as Record<string, unknown>) ?? {}

        await authIdentityProviderService.update(authIdentity.id, {
          provider_metadata: {
            ...existingMeta,
            hashed_pin: hashedPin,
          },
        })

        // On rafraîchit l'identité pour retourner la version à jour
        const updatedIdentity = await authIdentityProviderService.retrieve({
            entity_id: phone,
        })

        return { success: true, authIdentity: updatedIdentity }
      } catch (error: any) {
        return { success: false, error: `Erreur lors de la mise à jour du PIN : ${error.message}` }
      }
    }

    // Comportement standard : vérification du PIN actuel
    if (!providerIdentity?.provider_metadata?.hashed_pin) {
      return { success: false, error: "Ce compte n'a pas de code de sécurité configuré." }
    }

    const pinMatches = await bcrypt.compare(
      pin,
      providerIdentity.provider_metadata.hashed_pin as string
    )

    if (!pinMatches) {
      return { success: false, error: "Code de sécurité incorrect." }
    }

    return { success: true, authIdentity }
  }

  /**
   * Inscription d'un nouveau client.
   * Crée l'identité avec le PIN haché.
   */
  async register(
    input: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const { phone, pin } = (input.body ?? {}) as Record<string, string>

    if (!phone || !pin) {
      return { success: false, error: "Le numéro de téléphone et le code de sécurité sont requis." }
    }

    // Vérifier que le compte n'existe pas déjà
    try {
      await authIdentityProviderService.retrieve({ entity_id: phone })
      return { success: false, error: "Un compte existe déjà pour ce numéro de téléphone." }
    } catch {
      // Normal : le compte n'existe pas encore, on peut continuer
    }

    // Hasher le PIN avant stockage
    const hashedPin = await bcrypt.hash(pin, this.SALT_ROUNDS)

    const authIdentity = await authIdentityProviderService.create({
      entity_id: phone,
      provider_metadata: {
        hashed_pin: hashedPin,
      },
    })

    return { success: true, authIdentity }
  }

  /**
   * Mise à jour du PIN — appel direct depuis les routes PIN reset/update.
   */
  async updatePin(
    phone: string,
    newPin: string,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<void> {
    const authIdentity = await authIdentityProviderService.retrieve({
      entity_id: phone,
    })

    const hashedPin = await bcrypt.hash(newPin, this.SALT_ROUNDS)

    const existingMeta =
      (authIdentity.provider_identities?.[0]?.provider_metadata as Record<string, unknown>) ?? {}

    await authIdentityProviderService.update(authIdentity.id, {
      provider_metadata: {
        ...existingMeta,
        hashed_pin: hashedPin,
      },
    })
  }
}
