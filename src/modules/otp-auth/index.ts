import { Module } from "@medusajs/framework/utils"
import { OtpAuthService } from "./service"
import { OtpCode } from "./models/otp_code"

export const OTP_AUTH_MODULE = "otpAuth"

export default Module(OTP_AUTH_MODULE, {
  service: OtpAuthService,
})

