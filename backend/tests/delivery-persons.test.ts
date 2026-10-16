import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { dataSource } from '../src/database/data-source'
import { DeliveryPerson, Order, OrderItem, OrderStatus, Product, UserRole } from '../src/database/entities'
import { upsertUser } from './db'

let adminToken = ''
let viewerToken = ''
const createdPersonIds: string[] = []

beforeAll(async () => {
  await upsertUser('admin@fastmeals.com', 'Admin@123', UserRole.admin)
  await upsertUser('viewer@fastmeals.com', 'Viewer@123', UserRole.viewer)
  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@fastmeals.com',
    password: 'Admin@123',
  })
  const viewerLogin = await request(app).post('/api/auth/login').send({
    email: 'viewer@fastmeals.com',
    password: 'Viewer@123',
  })
  adminToken = adminLogin.body.accessToken as string
  viewerToken = viewerLogin.body.accessToken as string
})

afterAll(async () => {
  if (createdPersonIds.length > 0) {
    await dataSource.query(`DELETE FROM orders WHERE delivery_person_id = ANY($1::uuid[])`, [createdPersonIds])
    await dataSource.getRepository(DeliveryPerson).delete(createdPersonIds)
  }
})

describe('entregadores', () => {
  it('cria um entregador valido', async () => {
    const response = await request(app)
      .post('/api/delivery-persons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Entregador Teste',
        phone: '(11) 91234-0000',
        vehicleType: 'bicycle',
        currentLatitude: -23.55,
        currentLongitude: -46.63,
      })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      name: 'Entregador Teste',
      phone: '(11) 91234-0000',
      vehicleType: 'bicycle',
      isActive: true,
      currentOrderId: null,
    })
    createdPersonIds.push(response.body.id as string)
  })

  it('impede excluir quem esta em uma entrega', async () => {
    const created = await request(app)
      .post('/api/delivery-persons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Entregador Ocupado',
        phone: '(11) 92345-0000',
        vehicleType: 'motorcycle',
      })
    const personId = created.body.id as string
    createdPersonIds.push(personId)
    const product = await dataSource.getRepository(Product).findOneByOrFail({ isAvailable: true })
    const person = await dataSource.getRepository(DeliveryPerson).findOneByOrFail({ id: personId })
    const orders = dataSource.getRepository(Order)
    const order = await orders.save(
      orders.create({
        customerName: 'Cliente em rota',
        customerPhone: '(11) 93456-0000',
        deliveryAddress: 'Rua da Rota, 20, Sao Paulo - SP',
        latitude: -23.56,
        longitude: -46.64,
        status: OrderStatus.delivering,
        totalAmount: product.price,
        deliveryPerson: person,
        items: [dataSource.getRepository(OrderItem).create({ product, quantity: 1, unitPrice: product.price })],
      }),
    )

    try {
      const response = await request(app)
        .delete(`/api/delivery-persons/${personId}`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('DELIVERY_PERSON_IN_USE')
    } finally {
      await orders.delete(order.id)
    }
  })

  it('recusa criacao feita por um viewer', async () => {
    const response = await request(app)
      .post('/api/delivery-persons')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: 'Entregador Proibido',
        phone: '(11) 94567-0000',
        vehicleType: 'car',
      })
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })
})
