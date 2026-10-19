import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { UserRole } from '../../../domain/catalog.js'
import { enumValues } from '../utils/column-types.js'
import type { RefreshToken } from './refresh-token.entity.js'

@Entity('users')
@Index('idx_users_email', ['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string

  @Column({ type: 'varchar', length: 255 })
  password!: string

  @Column({ type: 'enum', enum: enumValues(UserRole), enumName: 'UserRole' })
  role!: UserRole

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date

  @OneToMany('RefreshToken', 'user')
  refreshTokens!: RefreshToken[]
}
