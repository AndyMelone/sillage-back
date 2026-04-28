import { defineMiddlewares } from "@medusajs/medusa"
import { authenticate } from "@medusajs/framework/http"

/**
 * Configuration des middlewares pour les routes API custom.
 *
 * Les routes /store/auth/* (login, register, OTP) sont publiques par défaut.
 * Seules les opérations sur un compte authentifié requièrent un JWT.
 */
export default defineMiddlewares({
  routes: [
    {
      // Modification du PIN : requiert un JWT valide (utilisateur connecté)
      matcher: "/store/auth/pin/update",
      method: ["POST"],
      middlewares: [
        authenticate("customer", ["bearer"]),
      ],
    },
  ],
})
