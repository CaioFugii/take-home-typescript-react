import rateLimit from 'express-rate-limit'
import { config } from '../config'

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Limite de requisicoes atingido',
        details: [],
      },
    })
  },
})
