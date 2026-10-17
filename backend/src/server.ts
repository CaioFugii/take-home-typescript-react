import 'reflect-metadata'
import { app } from './app'
import { config } from './config'
import { dataSource } from './infrastructure/database/data-source'
import { logger } from './utils/logger'

async function main(): Promise<void> {
  await dataSource.initialize()
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'API FastMeals ouvindo')
  })

  async function shutdown(): Promise<void> {
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
    if (dataSource.isInitialized) {
      await dataSource.destroy()
    }
  }

  process.on('SIGTERM', () => {
    void shutdown()
  })

  process.on('SIGINT', () => {
    void shutdown()
  })
}

void main()
