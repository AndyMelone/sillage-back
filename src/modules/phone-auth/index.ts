import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { PhoneOtpAuthProvider } from "./service"

export default ModuleProvider(Modules.AUTH, {
  services: [PhoneOtpAuthProvider],
})


