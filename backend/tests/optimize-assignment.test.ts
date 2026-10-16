import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { dataSource } from '../src/database/data-source'
import { DeliveryPerson, Order, OrderStatus, UserRole } from '../src/database/entities'
import { upsertUser } from './db'

let adminToken = ''
let viewerToken = ''

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

describe('POST /api/orders/optimize-assignment', () => {
  it('atribui cada pedido pronto a um entregador livre', async () => {
    const ready = await dataSource.getRepository(Order).count({ where: { status: OrderStatus.ready } })
    const available = await dataSource
      .getRepository(DeliveryPerson)
      .createQueryBuilder('person')
      .leftJoin('person.orders', 'activeOrder', 'activeOrder.status = :delivering', { delivering: OrderStatus.delivering })
      .where('person.isActive = true')
      .andWhere('person.currentLatitude IS NOT NULL')
      .andWhere('person.currentLongitude IS NOT NULL')
      .andWhere('activeOrder.id IS NULL')
      .getCount()
    expect(ready).toBeGreaterThan(0)
    expect(available).toBeGreaterThan(0)

    const response = await request(app)
      .post('/api/orders/optimize-assignment')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    expect(response.body.algorithm).toBe('hungarian')
    expect(response.body.assignments).toHaveLength(Math.min(ready, available))
    expect(response.body.unassigned).toHaveLength(Math.max(0, ready - available))
    expect(response.body.totalDistanceKm).toBeGreaterThan(0)
    const people = response.body.assignments.map((item: { deliveryPersonId: string }) => item.deliveryPersonId)
    expect(new Set(people).size).toBe(people.length)
  })

  it('lista os pedidos prontos como nao atribuidos quando nao ha entregador', async () => {
    const people = dataSource.getRepository(DeliveryPerson)
    const snapshot = await people.find({ select: { id: true, isActive: true } })
    const readyCount = await dataSource.getRepository(Order).count({ where: { status: OrderStatus.ready } })
    await people.createQueryBuilder().update().set({ isActive: false }).execute()

    try {
      const response = await request(app)
        .post('/api/orders/optimize-assignment')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.assignments).toEqual([])
      expect(response.body.totalDistanceKm).toBe(0)
      expect(response.body.unassigned).toHaveLength(readyCount)
      expect(response.body.unassigned.every((item: { reason: string }) => item.reason === 'No available delivery person')).toBe(true)
    } finally {
      await Promise.all(
        snapshot.map((person) =>
          people.update(person.id, { isActive: person.isActive }),
        ),
      )
    }
  })

  it('recusa a sugestao feita por um viewer', async () => {
    const response = await request(app)
      .post('/api/orders/optimize-assignment')
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })
})
