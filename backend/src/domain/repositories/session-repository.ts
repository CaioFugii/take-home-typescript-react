import type { UserRole } from '../catalog'

export type UserRecord = {
  id: string
  email: string
  passwordHash: string
  role: UserRole
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>
}

export type RefreshTokenRecord = {
  id: string
  user: { id: string; email: string; role: UserRole }
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
}

export type NewRefreshToken = {
  userId: string
  tokenHash: string
  expiresAt: Date
}

export interface RefreshTokenRepository {
  issue(input: NewRefreshToken): Promise<void>
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>
  rotate(currentId: string, next: NewRefreshToken): Promise<boolean>
  revokeByHash(tokenHash: string): Promise<void>
}
