// TEMPORARY — Remove this file + its usages when real SMS/WhatsApp sending is live.
// Set DEV_OTP_CODE env var to use a fixed bypass code instead of a random one.
export const getDevOtp = (): string | null =>
  process.env.DEV_OTP_CODE ?? null
