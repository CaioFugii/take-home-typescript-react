import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import type { User } from './user.entity.js'

@Entity('refresh_tokens')
@Index('idx_refresh_tokens_user_id', ['user'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne('User', 'refreshTokens', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column({ type: 'varchar', length: 64, name: 'token_hash', unique: true })
  tokenHash!: string

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt!: Date | null

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date
}
