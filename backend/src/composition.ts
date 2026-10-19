import { bindRepositories } from './context'
import { dataSource } from './infrastructure/database/data-source'
import { TypeOrmDeliveryPersonRepository } from './infrastructure/database/delivery-person.repository'
import { TypeOrmOrderRepository } from './infrastructure/database/order.repository'
import { TypeOrmProductRepository } from './infrastructure/database/product.repository'
import { TypeOrmReportRepository } from './infrastructure/database/report.repository'
import { TypeOrmRefreshTokenRepository, TypeOrmUserRepository } from './infrastructure/database/session.repository'

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
