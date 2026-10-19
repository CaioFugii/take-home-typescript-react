import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ProductCategory } from '../../../domain/catalog.js'
import { enumValues, money } from '../utils/column-types.js'
import type { OrderItem } from './order-item.entity.js'

@Entity('products')
@Index('idx_products_category', ['category'])
@Index('idx_products_is_available', ['isAvailable'])
@Index('idx_products_name', ['name'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 120 })
  name!: string

  @Column({ type: 'varchar', length: 500 })
  description!: string

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: money })
  price!: number

  @Column({ type: 'enum', enum: enumValues(ProductCategory), enumName: 'ProductCategory' })
  category!: ProductCategory

  @Column({ type: 'varchar', length: 500, name: 'image_url', nullable: true })
  imageUrl!: string | null

  @Column({ type: 'boolean', name: 'is_available', default: true })
  isAvailable!: boolean

  @Column({ type: 'int', name: 'preparation_time' })
  preparationTime!: number

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date

  @OneToMany('OrderItem', 'product')
  orderItems!: OrderItem[]
}
