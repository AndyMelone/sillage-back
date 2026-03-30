import { Module } from "@medusajs/framework/utils"
import { OtpNotificationService } from "./service"


export const OTP_NOTIFICATION_MODULE = "otpNotification"

export default Module(OTP_NOTIFICATION_MODULE, {
  service: OtpNotificationService,
})
