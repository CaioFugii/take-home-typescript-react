import './types/express'
import { registerRepositories } from './composition'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { pinoHttp } from 'pino-http'
import { config } from './config'
import { errorHandler } from './middlewares/error-handler'
import { apiRateLimit } from './middlewares/rate-limit'
import { authRouter } from './routes/auth.routes'
import { healthRouter } from './routes/health.routes'
import { deliveryPersonRouter } from './routes/delivery-person.routes'
import { orderRouter } from './routes/order.routes'
import { productRouter } from './routes/product.routes'
import { reportRouter } from './routes/report.routes'
import { logger } from './utils/logger'

registerRepositories()

export const app = express()

app.set('trust proxy', 1)
app.disable('x-powered-by')

if (config.nodeEnv !== 'test') {
  app.use(pinoHttp({ logger }))
}

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())
app.use('/api', apiRateLimit)
app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/products', productRouter)
app.use('/api/orders', orderRouter)
app.use('/api/delivery-persons', deliveryPersonRouter)
app.use('/api/reports', reportRouter)
app.use(errorHandler)
