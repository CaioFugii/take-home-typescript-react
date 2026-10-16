import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { dataSource } from '../src/database/data-source'
import { Order, OrderStatus, Product, UserRole } from '../src/database/entities'
import { upsertUser } from './db'

let adminToken = ''
let viewerToken = ''
const createdOrderIds: string[] = []

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
  if (createdOrderIds.length > 0) {
    await dataSource.getRepository(Order).delete(createdOrderIds)
  }
})

async function createPendingOrder(): Promise<string> {
  const product = await dataSource.getRepository(Product).findOneByOrFail({
    isAvailable: true,
    name: 'Agua Mineral 500ml',
  })
  const response = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      customerName: 'Cliente de Teste',
      customerPhone: '(11) 98888-0000',
      deliveryAddress: 'Rua dos Testes, 50, Sao Paulo - SP',
      latitude: -23.55,
      longitude: -46.63,
      items: [{ productId: product.id, quantity: 2 }],
    })
  expect(response.status).toBe(201)
  expect(response.body.status).toBe('pending')
  expect(response.body.totalAmount).toBe(10)
  expect(response.body.items[0].unitPrice).toBe(5)
  const id = response.body.id as string
  createdOrderIds.push(id)
  return id
}

describe('pedidos', () => {
  it('aceita a transicao de pending para preparing', async () => {
    const id = await createPendingOrder()
    const response = await request(app)
      .patch(`/api/orders/${id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'preparing' })

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('preparing')
  })

  it('rejeita transicao invalida e entrega sem entregador', async () => {
    const id = await createPendingOrder()
    await dataSource.getRepository(Order).update(id, { status: OrderStatus.delivered })

    const invalid = await request(app)
      .patch(`/api/orders/${id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'pending' })

    expect(invalid.status).toBe(422)
    expect(invalid.body.error.code).toBe('INVALID_STATUS_TRANSITION')
    expect(invalid.body.error.message).toContain("de 'delivered' para 'pending'")

    const readyId = await createPendingOrder()
    await dataSource.getRepository(Order).update(readyId, { status: OrderStatus.ready })
    const withoutCourier = await request(app)
      .patch(`/api/orders/${readyId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivering' })

    expect(withoutCourier.status).toBe(422)
    expect(withoutCourier.body.error.code).toBe('INVALID_STATUS_TRANSITION')
  })

  it('recusa mudanca de status feita por um viewer', async () => {
    const id = await createPendingOrder()
    const response = await request(app)
      .patch(`/api/orders/${id}/status`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ status: 'preparing' })

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })
})
