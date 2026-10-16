import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

loadEnv()

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().min(1).default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
  PORT: z
    .string()
    .default('3001')
    .transform((value) => Number(value))
    .pipe(z.number().int().positive()),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((value) => Number(value))
    .pipe(z.number().int().positive()),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => issue.path.join('.') || 'env').join(', ')
  throw new Error(`Variaveis de ambiente invalidas: ${details}`)
}

export const config = {
  databaseUrl: parsed.data.DATABASE_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  jwtRefreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,
  port: parsed.data.PORT,
  nodeEnv: parsed.data.NODE_ENV,
  corsOrigin: parsed.data.CORS_ORIGIN,
  cookieSecure: parsed.data.COOKIE_SECURE === 'true',
  rateLimitMax: parsed.data.RATE_LIMIT_MAX,
}
