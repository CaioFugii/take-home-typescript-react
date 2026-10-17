import type { DataSource } from 'typeorm'
import { IsNull } from 'typeorm'
import type {
  NewRefreshToken,
  RefreshTokenRecord,
  RefreshTokenRepository,
  UserRecord,
  UserRepository,
} from '../../domain/session-repository'
import { RefreshToken, User } from './entities'

function toUser(user: User): UserRecord {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.password,
    role: user.role,
  }
}

function toToken(token: RefreshToken): RefreshTokenRecord {
  return {
    id: token.id,
    user: { id: token.user.id, email: token.user.email, role: token.user.role },
    tokenHash: token.tokenHash,
    expiresAt: token.expiresAt,
    revokedAt: token.revokedAt,
  }
}

export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.dataSource.getRepository(User).findOne({ where: { email } })
    return user ? toUser(user) : null
  }
}

export class TypeOrmRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly dataSource: DataSource) {}

  async issue(input: NewRefreshToken): Promise<void> {
    const tokens = this.dataSource.getRepository(RefreshToken)
    await tokens.save(
      tokens.create({
        user: { id: input.userId } as User,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      }),
    )
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const stored = await this.dataSource.getRepository(RefreshToken).findOne({
      where: { tokenHash },
      relations: { user: true },
    })
    return stored ? toToken(stored) : null
  }

  async rotate(currentId: string, next: NewRefreshToken): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const revoked = await manager.update(RefreshToken, { id: currentId, revokedAt: IsNull() }, { revokedAt: new Date() })
      if (revoked.affected !== 1) {
        return false
      }
      const user = await manager.findOne(User, { where: { id: next.userId } })
      if (!user) {
        return false
      }
      await manager.save(
        manager.create(RefreshToken, {
          user,
          tokenHash: next.tokenHash,
          expiresAt: next.expiresAt,
        }),
      )
      return true
    })
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await this.dataSource.getRepository(RefreshToken).update(
      { tokenHash, revokedAt: IsNull() },
      { revokedAt: new Date() },
    )
  }
}
