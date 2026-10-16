import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { UserRole } from '../src/database/entities'
import { upsertUser } from './db'

const adminEmail = 'admin@fastmeals.com'
const adminPassword = 'Admin@123'

beforeAll(async () => {
  await upsertUser(adminEmail, adminPassword, UserRole.admin)
})

describe('POST /api/auth/login', () => {
  it('autentica o admin e devolve os tokens com cookie httpOnly', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: adminEmail,
      password: adminPassword,
    })

    expect(response.status).toBe(200)
    expect(response.body.accessToken).toEqual(expect.any(String))
    expect(response.body.refreshToken).toEqual(expect.any(String))
    expect(response.body.user).toMatchObject({
      email: adminEmail,
      role: 'admin',
    })

    const cookie = response.headers['set-cookie']
    const serialized = Array.isArray(cookie) ? cookie.join(';') : String(cookie)
    expect(serialized).toContain('refreshToken=')
    expect(serialized.toLowerCase()).toContain('httponly')
  })

  it('rejeita senha incorreta', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: adminEmail,
      password: 'senha-errada',
    })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou senha invalidos',
        details: [],
      },
    })
  })
})
