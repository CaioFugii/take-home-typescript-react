import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { dataSource } from '../src/infrastructure/database/data-source'
import { UserRole } from '../src/infrastructure/database/entities'
import { upsertUser } from './db'

const LIMIT_MS = 200
const VOLUME = 10_000

let adminToken = ''

beforeAll(async () => {
  await upsertUser('admin@fastmeals.com', 'Admin@123', UserRole.admin)
  const login = await request(app).post('/api/auth/login').send({
    email: 'admin@fastmeals.com',
    password: 'Admin@123',
  })
  adminToken = login.body.accessToken as string

  await dataSource.query(
    `
    INSERT INTO products (name, description, price, category, is_available, preparation_time, created_at)
    SELECT
      'carga-' || i,
      'Produto de carga',
      10 + (i % 50),
      (ARRAY['meal','drink','dessert','side'])[1 + (i % 4)]::"ProductCategory",
      (i % 5) <> 0,
      1 + (i % 30),
      TIMESTAMP '2024-01-01' + (i || ' seconds')::interval
    FROM generate_series(1, $1) AS i
  `,
    [VOLUME],
  )
  await dataSource.query(
    `
    INSERT INTO orders (
      customer_name, customer_phone, delivery_address, latitude, longitude, status, total_amount, created_at
    )
    SELECT
      'carga-pedido-' || i,
      '(11) 98888-0000',
      'Rua da Carga, 100',
      -23.55000000,
      -46.63000000,
      (ARRAY['pending','preparing','ready','delivering','delivered','cancelled'])[1 + (i % 6)]::"OrderStatus",
      15 + (i % 40),
      TIMESTAMP '2024-06-01' + (i || ' seconds')::interval
    FROM generate_series(1, $1) AS i
  `,
    [VOLUME],
  )
  await dataSource.query(`
    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    SELECT o.id, p.id, 1, 12.50
    FROM orders o
    JOIN LATERAL (SELECT id FROM products WHERE name LIKE 'carga-%' ORDER BY name LIMIT 1) p ON true
    WHERE o.customer_name LIKE 'carga-pedido-%'
  `)
  await dataSource.query('ANALYZE products, orders, order_items')
}, 30_000)

afterAll(async () => {
  await dataSource.query(`DELETE FROM orders WHERE customer_name LIKE 'carga-pedido-%'`)
  await dataSource.query(`DELETE FROM products WHERE name LIKE 'carga-%'`)
})

async function timedGet(path: string): Promise<{ elapsedMs: number; body: { pagination: { total: number } } }> {
  const started = performance.now()
  const response = await request(app).get(path).set('Authorization', `Bearer ${adminToken}`)
  const elapsedMs = performance.now() - started
  expect(response.status).toBe(200)
  return { elapsedMs, body: response.body }
}

describe('listagens com 10 mil registros', () => {
  it('lista produtos em menos de 200ms', async () => {
    const first = await timedGet('/api/products?page=1&limit=20')
    const last = await timedGet('/api/products?page=500&limit=20&sortBy=price&sortOrder=asc')
    const search = await timedGet('/api/products?page=1&limit=100&search=carga-1&sortBy=name&sortOrder=asc')

    expect(first.body.pagination.total).toBeGreaterThanOrEqual(VOLUME)
    expect(first.elapsedMs).toBeLessThan(LIMIT_MS)
    expect(last.elapsedMs).toBeLessThan(LIMIT_MS)
    expect(search.elapsedMs).toBeLessThan(LIMIT_MS)
  })

  it('lista pedidos em menos de 200ms', async () => {
    const first = await timedGet('/api/orders?page=1&limit=20')
    const last = await timedGet('/api/orders?page=500&limit=20&sortBy=totalAmount&sortOrder=desc')
    const filtered = await timedGet('/api/orders?page=1&limit=100&status=pending')

    expect(first.body.pagination.total).toBeGreaterThanOrEqual(VOLUME)
    expect(first.elapsedMs).toBeLessThan(LIMIT_MS)
    expect(last.elapsedMs).toBeLessThan(LIMIT_MS)
    expect(filtered.elapsedMs).toBeLessThan(LIMIT_MS)
  })
})
