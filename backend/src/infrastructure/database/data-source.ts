import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { config } from '../../config'
import {
  DeliveryPerson,
  Order,
  OrderItem,
  OrderStatusEvent,
  Product,
  RefreshToken,
  User,
} from './entities'
import { Init1760600000000 } from './migrations/1760600000000-Init'

export const dataSource = new DataSource({
  type: 'postgres',
  url: config.databaseUrl,
  entities: [User, Product, DeliveryPerson, Order, OrderItem, RefreshToken, OrderStatusEvent],
  migrations: [Init1760600000000],
  synchronize: false,
  logging: config.nodeEnv === 'development',
})
