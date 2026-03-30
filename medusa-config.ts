import { ContainerRegistrationKeys, defineConfig, loadEnv, Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    {
      resolve: "./src/modules/otp-auth",
    },
    {
      resolve: "./src/modules/otp-notification",
    },
    {
      resolve: "@medusajs/medusa/auth", // ✅ préfixe correct
      dependencies: [
        Modules.CACHE,
        ContainerRegistrationKeys.LOGGER,
        Modules.EVENT_BUS,
      ],
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass", // ✅ préfixe correct
            id: "emailpass",
          },
          {
            resolve: "./src/modules/phone-auth",
            id: "phone-otp",
          },
        ],
      },
    },
  ],
})