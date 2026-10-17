import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { dataSource } from '../src/infrastructure/database/data-source'
import { Order, OrderItem, OrderStatus, Product, UserRole } from '../src/infrastructure/database/entities'
import { upsertUser } from './db'

const adminEmail = 'admin@fastmeals.com'
const viewerEmail = 'viewer@fastmeals.com'

let adminToken = ''
let viewerToken = ''

const createdIds: string[] = []

beforeAll(async () => {
  await upsertUser(adminEmail, 'Admin@123', UserRole.admin)
  await upsertUser(viewerEmail, 'Viewer@123', UserRole.viewer)

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: adminEmail,
    password: 'Admin@123',
  })
  const viewerLogin = await request(app).post('/api/auth/login').send({
    email: viewerEmail,
    password: 'Viewer@123',
  })
  adminToken = adminLogin.body.accessToken as string
  viewerToken = viewerLogin.body.accessToken as string
})

afterAll(async () => {
  if (createdIds.length > 0) {
    await dataSource.query(`DELETE FROM order_items WHERE product_id = ANY($1::uuid[])`, [createdIds])
    await dataSource.getRepository(Product).delete(createdIds)
  }
})

describe('produtos', () => {
  it('cria um produto valido', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Suco Teste API',
        description: 'Suco de laranja feito na hora para o teste de criacao',
        price: 12.5,
        category: 'drink',
        preparationTime: 5,
      })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      name: 'Suco Teste API',
      description: 'Suco de laranja feito na hora para o teste de criacao',
      price: 12.5,
      category: 'drink',
      imageUrl: null,
      isAvailable: true,
      preparationTime: 5,
    })
    expect(response.body.id).toEqual(expect.any(String))
    createdIds.push(response.body.id as string)
  })

  it('rejeita campos invalidos', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'AB',
        description: 'curta',
        price: 0,
        category: 'lanche',
        preparationTime: 0,
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    const fields = (response.body.error.details as Array<{ field: string }>).map((detail) => detail.field)
    expect(fields).toEqual(expect.arrayContaining(['name', 'description', 'price', 'category', 'preparationTime']))
  })

  it('bloqueia a exclusao quando o produto esta em pedido pending', async () => {
    const created = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Produto Em Uso',
        description: 'Produto criado apenas para testar o bloqueio de exclusao',
        price: 10,
        category: 'side',
        preparationTime: 8,
      })
    const productId = created.body.id as string
    createdIds.push(productId)

    const product = await dataSource.getRepository(Product).findOneByOrFail({ id: productId })
    const orders = dataSource.getRepository(Order)
    const order = await orders.save(
      orders.create({
        customerName: 'Cliente Teste',
        customerPhone: '(11) 90000-0000',
        deliveryAddress: 'Rua de Teste, 100, Sao Paulo - SP',
        latitude: -23.55,
        longitude: -46.63,
        status: OrderStatus.pending,
        totalAmount: 10,
        deliveryPerson: null,
        items: [dataSource.getRepository(OrderItem).create({ product, quantity: 1, unitPrice: 10 })],
      }),
    )

    try {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('PRODUCT_IN_USE')
    } finally {
      await orders.delete(order.id)
    }
  })

  it('recusa criacao feita por um viewer', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: 'Produto Proibido',
        description: 'Um viewer nao pode criar produto no cardapio',
        price: 9,
        category: 'meal',
        preparationTime: 10,
      })

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })
})
