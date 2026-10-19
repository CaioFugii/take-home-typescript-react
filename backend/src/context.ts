import type { DeliveryPersonRepository } from './domain/repositories/delivery-person-repository'
import type { OrderRepository } from './domain/repositories/order-repository'
import type { ProductRepository } from './domain/repositories/product-repository'
import type { RefreshTokenRepository, UserRepository } from './domain/repositories/session-repository'
import type { ReportRepository } from './domain/repositories/report-repository'

export type Repositories = {
  products: ProductRepository
  orders: OrderRepository
  deliveryPersons: DeliveryPersonRepository
  users: UserRepository
  refreshTokens: RefreshTokenRepository
  reports: ReportRepository
}

let current: Repositories | null = null

export function bindRepositories(repositories: Repositories): void {
  current = repositories
}

export function repositories(): Repositories {
  if (!current) {
    throw new Error('Repositorios nao configurados')
  }
  return current
}
