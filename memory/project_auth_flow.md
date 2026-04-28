---
name: Auth flow Sillage backend
description: Architecture et état d'implémentation du flow d'auth custom (téléphone + OTP + PIN) dans le backend MedusaJS
type: project
---

Backend MedusaJS v2.13.1 avec auth 100% custom par téléphone (pas d'email).

**Flow implémenté :**

**Compte existant (login 2FA) :**
1. `POST /store/auth/check-phone` → `{ exists: true }`
2. `POST /store/auth/otp/send` → body: `{ phone, pin, channel? }` → vérifie PIN + envoie OTP
3. `POST /store/auth/otp/verify` → body: `{ phone, code }` → retourne `{ token, customer: { id } }`

**Nouveau compte :**
1. `POST /store/auth/check-phone` → `{ exists: false }`
2. `POST /store/auth/otp/send-new-account` → body: `{ phone, channel? }` → envoie OTP (pas de PIN)
3. `POST /store/auth/register-pin` → body: `{ phone, otp, pin }` → crée auth identity + customer Medusa → retourne `{ token, customer: { id, phone } }`

**Reset PIN :**
1. `POST /store/auth/otp/send-reset-pin` → body: `{ phone, channel? }`
2. `POST /store/auth/pin/reset` → body: `{ phone, otp, new_pin }` → retourne `{ token, customer: { id } }`

**Login PIN direct (sans 2FA) :**
- `POST /store/auth/login-pin` → body: `{ phone, pin }` → retourne `{ token, customer: { id } }`

**Modules custom :**
- `otpAuth` (OTP_AUTH_MODULE) : génération/vérification OTP, stockage hashé bcrypt, rate limiting
- `otpNotification` : envoi WhatsApp/SMS (mode simulation pour dev)
- `phone-auth` (provider AUTH) : `PhoneOtpAuthProvider` — authenticate + register + updatePin

**Token JWT :**
- Généré via `generateJwtToken` de `@medusajs/framework/utils`
- Payload : `{ actor_id: customer_id, actor_type: "customer", auth_identity_id, app_metadata: { customer_id, roles: [] } }`
- Secret : `process.env.JWT_SECRET`
- Expiration : 30j

**Helper partagé :** `src/api/store/auth/_helpers.ts`
- `generateCustomerToken(authIdentityId, customerId)` → string
- `getOrCreateLinkedCustomer(scope, authIdentity, phone)` → customerId (avec lazy creation pour anciens comptes)

**Channel OTP :** WhatsApp par défaut, SMS optionnel.

**Why:** `createCustomerAccountWorkflow` de `@medusajs/core-flows` lie le customer à l'auth identity via `app_metadata.customer_id`, nécessaire pour que le JWT soit valide dans le store Medusa.
