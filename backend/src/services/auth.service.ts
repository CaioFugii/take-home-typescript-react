import { createHash, randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import { config } from '../config'
import { repositories } from '../context'
import type { UserRecord } from '../domain/session-repository'
import type { AuthenticatedUser } from '../types/auth'
import { AppError } from '../utils/errors'

const BCRYPT_ROUNDS = 12

type IssuedTokens = {
  accessToken: string
  refreshToken: string
  user: AuthenticatedUser
}

type AccessClaims = JwtPayload & {
  email: string
  role: 'admin' | 'viewer'
  type: 'access'
}

type RefreshClaims = JwtPayload & {
  type: 'refresh'
}

let dummyPasswordHash: Promise<string> | null = null

function getDummyPasswordHash(): Promise<string> {
  dummyPasswordHash ??= bcrypt.hash('not-a-real-password', BCRYPT_ROUNDS)
  return dummyPasswordHash
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function durationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value)
  if (!match?.[1] || !match[2]) {
    return 7 * 24 * 60 * 60 * 1000
  }
  const amount = Number(match[1])
  const unit = match[2]
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  }
  return amount * (multipliers[unit] ?? 86_400_000)
}

function signAccessToken(user: AuthenticatedUser): string {
  const options: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] }
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'access' },
    config.jwtSecret,
    options,
  )
}

function signRefreshToken(userId: string): { token: string; expiresAt: Date } {
  const options: SignOptions = {
    expiresIn: config.jwtRefreshExpiresIn as SignOptions['expiresIn'],
    jwtid: randomUUID(),
  }
  const token = jwt.sign({ sub: userId, type: 'refresh' }, config.jwtRefreshSecret, options)
  return {
    token,
    expiresAt: new Date(Date.now() + durationToMs(config.jwtRefreshExpiresIn)),
  }
}

function isAccessClaims(value: unknown): value is AccessClaims {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const payload = value as Record<string, unknown>
  return (
    payload.type === 'access' &&
    typeof payload.sub === 'string' &&
    typeof payload.email === 'string' &&
    (payload.role === 'admin' || payload.role === 'viewer')
  )
}

function isRefreshClaims(value: unknown): value is RefreshClaims {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const payload = value as Record<string, unknown>
  return payload.type === 'refresh' && typeof payload.sub === 'string'
}

function toAuthenticatedUser(user: { id: string; email: string; role: UserRecord['role'] }): AuthenticatedUser {
  return { id: user.id, email: user.email, role: user.role }
}

async function issueTokenPair(user: AuthenticatedUser): Promise<IssuedTokens> {
  const accessToken = signAccessToken(user)
  const refresh = signRefreshToken(user.id)
  await repositories().refreshTokens.issue({
    userId: user.id,
    tokenHash: hashToken(refresh.token),
    expiresAt: refresh.expiresAt,
  })
  return { accessToken, refreshToken: refresh.token, user }
}

export async function login(email: string, password: string): Promise<IssuedTokens> {
  const user = await repositories().users.findByEmail(email)
  const passwordHash = user?.passwordHash ?? (await getDummyPasswordHash())
  const passwordMatches = await bcrypt.compare(password, passwordHash)

  if (!user || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email ou senha invalidos')
  }

  return issueTokenPair(toAuthenticatedUser(user))
}

export async function refreshSession(refreshToken: string): Promise<IssuedTokens> {
  let userId: string
  try {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret)
    if (!isRefreshClaims(decoded) || typeof decoded.sub !== 'string') {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token invalido ou expirado')
    }
    userId = decoded.sub
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token invalido ou expirado')
  }

  const stored = await repositories().refreshTokens.findByHash(hashToken(refreshToken))

  if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now() || stored.user.id !== userId) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token invalido ou expirado')
  }

  const user = toAuthenticatedUser(stored.user)
  const accessToken = signAccessToken(user)
  const nextRefresh = signRefreshToken(user.id)
  const rotated = await repositories().refreshTokens.rotate(stored.id, {
    userId: user.id,
    tokenHash: hashToken(nextRefresh.token),
    expiresAt: nextRefresh.expiresAt,
  })
  if (!rotated) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token invalido ou expirado')
  }

  return { accessToken, refreshToken: nextRefresh.token, user }
}

export async function revokeRefreshToken(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) {
    return
  }
  await repositories().refreshTokens.revokeByHash(hashToken(refreshToken))
}

export function verifyAccessToken(token: string): AuthenticatedUser {
  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    if (!isAccessClaims(decoded) || typeof decoded.sub !== 'string') {
      throw new AppError(401, 'INVALID_TOKEN', 'Token mal formado ou invalido')
    }
    return { id: decoded.sub, email: decoded.email, role: decoded.role }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Access token expirado')
    }
    throw new AppError(401, 'INVALID_TOKEN', 'Token mal formado ou invalido')
  }
}
