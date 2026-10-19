import { bindRepositories } from './context'
import { dataSource } from './infrastructure/database/data-source'
import { TypeOrmDeliveryPersonRepository } from './infrastructure/database/repositories/delivery-person.repository'
import { TypeOrmOrderRepository } from './infrastructure/database/repositories/order.repository'
import { TypeOrmProductRepository } from './infrastructure/database/repositories/product.repository'
import { TypeOrmReportRepository } from './infrastructure/database/repositories/report.repository'
import { TypeOrmRefreshTokenRepository, TypeOrmUserRepository } from './infrastructure/database/repositories/session.repository'

export function registerRepositories(): void {
  bindRepositories({
    products: new TypeOrmProductRepository(dataSource),
    orders: new TypeOrmOrderRepository(dataSource),
    deliveryPersons: new TypeOrmDeliveryPersonRepository(dataSource),
    users: new TypeOrmUserRepository(dataSource),
    refreshTokens: new TypeOrmRefreshTokenRepository(dataSource),
    reports: new TypeOrmReportRepository(dataSource),
  })
}
