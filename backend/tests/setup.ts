import { config as loadEnv } from 'dotenv'
import { beforeAll } from 'vitest'

loadEnv()
process.env.NODE_ENV = 'test'
process.env.RATE_LIMIT_MAX = '10000'

beforeAll(async () => {
  const { dataSource } = await import('../src/infrastructure/database/data-source.js')
  if (!dataSource.isInitialized) {
    await dataSource.initialize()
  }
})
