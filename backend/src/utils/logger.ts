import pino from 'pino'
import { config } from '../config'

export const logger = pino({
  level: config.nodeEnv === 'test' ? 'silent' : 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    censor: '[redacted]',
  },
})
