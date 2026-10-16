import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { dataSource } from '../src/database/data-source'
import {
  DeliveryPerson,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusEvent,
  Product,
  UserRole,
  VehicleType,
} from '../src/database/entities'
import { upsertUser } from './db'

let adminToken = ''
let orderId = ''
let productId = ''
let productName = ''
let expectedRevenue = 0

beforeAll(async () => {
  await upsertUser('admin@fastmeals.com', 'Admin@123', UserRole.admin)
  const login = await request(app).post('/api/auth/login').send({
    email: 'admin@fastmeals.com',
    password: 'Admin@123',
  })
  adminToken = login.body.accessToken as string

  const product = await dataSource.getRepository(Product).findOneByOrFail({ name: 'Agua Mineral 500ml' })
  const courier = await dataSource.getRepository(DeliveryPerson).findOneByOrFail({ vehicleType: VehicleType.bicycle })
  productId = product.id
  productName = product.name
  const unit = product.price
  expectedRevenue = Math.round(unit * 2 * 100) / 100
  const createdAt = new Date('2020-06-15T15:00:00.000Z')
  const orders = dataSource.getRepository(Order)
  const order = await orders.save(
    orders.create({
      customerName: 'Relatorio Isolado',
      customerPhone: '(11) 90000-1515',
      deliveryAddress: 'Rua do Relatorio, 15, Sao Paulo - SP',
      latitude: -23.55,
      longitude: -46.63,
      status: OrderStatus.delivered,
      totalAmount: expectedRevenue,
      deliveryPerson: courier,
      createdAt,
      items: [dataSource.getRepository(OrderItem).create({ product, quantity: 2, unitPrice: product.price })],
      statusEvents: [
        dataSource.getRepository(OrderStatusEvent).create({
          fromStatus: OrderStatus.delivering,
          toStatus: OrderStatus.delivered,
          createdAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
        }),
      ],
    }),
  )
  orderId = order.id
})

afterAll(async () => {
  if (orderId) {
    await dataSource.getRepository(Order).delete(orderId)
  }
})

describe('relatorios', () => {
  it('soma a receita dos pedidos entregues no periodo', async () => {
    const response = await request(app)
      .get('/api/reports/revenue')
      .query({ startDate: '2020-06-15', endDate: '2020-06-15' })
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      startDate: '2020-06-15',
      endDate: '2020-06-15',
      totalRevenue: expectedRevenue,
      totalOrders: 1,
      averageOrderValue: expectedRevenue,
      dailyRevenue: [{ date: '2020-06-15', revenue: expectedRevenue, orders: 1 }],
    })
  })

  it('lista os produtos mais vendidos apenas entre entregues', async () => {
    const response = await request(app)
      .get('/api/reports/top-products')
      .query({ startDate: '2020-06-15', endDate: '2020-06-15', limit: 10 })
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      {
        productId,
        productName,
        totalQuantity: 2,
        totalRevenue: expectedRevenue,
      },
    ])
  })

  it('mede o tempo ate a transicao para delivered', async () => {
    const response = await request(app)
      .get('/api/reports/average-delivery-time')
      .query({ startDate: '2020-06-15', endDate: '2020-06-15' })
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      averageMinutes: 30,
      fastestMinutes: 30,
      slowestMinutes: 30,
      totalDelivered: 1,
      byVehicleType: [{ vehicleType: 'bicycle', averageMinutes: 30, count: 1 }],
    })
  })
})
