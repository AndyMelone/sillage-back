/**
 * Service d'envoi de notifications OTP.
 * ⚠️ MODE SIMULATION : Les codes sont affichés dans les logs du serveur.
 * Pour passer en production, remplacez les corps des méthodes send* par
 * de vrais appels API (Meta WhatsApp Cloud, MTarget).
 */
export class OtpNotificationService {
  constructor() {}

  /**
   * Envoie un code OTP par WhatsApp via l'API Meta Cloud.
   * [SIMULATION] : Affiche le code dans les logs.
   */
  async sendViaWhatsapp(phone: string, code: string): Promise<void> {
    // --- PRODUCTION (décommenter quand vous avez vos tokens Meta) ---
    // const META_TOKEN = process.env.META_WHATSAPP_TOKEN
    // const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID
    // const TEMPLATE_NAME = process.env.META_OTP_TEMPLATE_NAME || "otp_code"
    //
    // await fetch(`https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`, {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${META_TOKEN}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     messaging_product: "whatsapp",
    //     to: phone,
    //     type: "template",
    //     template: {
    //       name: TEMPLATE_NAME,
    //       language: { code: "fr" },
    //       components: [
    //         { type: "body", parameters: [{ type: "text", text: code }] },
    //         { type: "button", sub_type: "url", index: "0",
    //           parameters: [{ type: "text", text: code }] },
    //       ],
    //     },
    //   }),
    // })

    // --- SIMULATION ---
    console.log(`
╔════════════════════════════════════════╗
║   [SIMULATION] WhatsApp OTP Message   ║
║   Destinataire : ${phone.padEnd(22)}║
║   Code Secret  : ${code.padEnd(22)}║
╚════════════════════════════════════════╝
    `)
  }

  /**
   * Envoie un code OTP par SMS via l'API MTarget.
   * [SIMULATION] : Affiche le code dans les logs.
   */
  async sendViaSms(phone: string, code: string): Promise<void> {
    // --- PRODUCTION (décommenter quand vous avez vos identifiants MTarget) ---
    // const MTARGET_USERNAME = process.env.MTARGET_USERNAME
    // const MTARGET_PASSWORD = process.env.MTARGET_PASSWORD
    // const MTARGET_SENDER = process.env.MTARGET_SENDER_NAME || "Sillage"
    //
    // const params = new URLSearchParams({
    //   username: MTARGET_USERNAME!,
    //   password: MTARGET_PASSWORD!,
    //   msisdn: phone,
    //   sender: MTARGET_SENDER,
    //   msg: `Votre code Sillage : ${code}. Valable 5 minutes. Ne le partagez jamais.`,
    // })
    //
    // const response = await fetch(`https://api.mtarget.fr/sms1.8?${params}`)
    // if (!response.ok) {
    //   throw new Error(`MTarget error: ${await response.text()}`)
    // }

    // --- SIMULATION ---
    console.log(`
╔════════════════════════════════════════╗
║   [SIMULATION] SMS OTP Message        ║
║   Destinataire : ${phone.padEnd(22)}║
║   Code Secret  : ${code.padEnd(22)}║
╚════════════════════════════════════════╝
    `)
  }
}
