import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { OrderStatus } from '../../../domain/catalog.js'
import type { DeliveryPerson } from './delivery-person.entity.js'
import type { OrderItem } from './order-item.entity.js'
import type { OrderStatusEvent } from './order-status-event.entity.js'
import { enumValues, latitude, longitude, money } from './column-types.js'

@Entity('orders')
@Index('idx_orders_status', ['status'])
@Index('idx_orders_status_created', ['status', 'createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 100, name: 'customer_name' })
  customerName!: string

  @Column({ type: 'varchar', length: 20, name: 'customer_phone' })
  customerPhone!: string

  @Column({ type: 'varchar', length: 300, name: 'delivery_address' })
  deliveryAddress!: string

  @Column({ type: 'decimal', precision: 10, scale: 8, transformer: latitude })
  latitude!: number

  @Column({ type: 'decimal', precision: 11, scale: 8, transformer: longitude })
  longitude!: number

  @Column({ type: 'enum', enum: enumValues(OrderStatus), enumName: 'OrderStatus', default: OrderStatus.pending })
  status!: OrderStatus

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount', transformer: money })
  totalAmount!: number

  @ManyToOne('DeliveryPerson', 'orders', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'delivery_person_id' })
  deliveryPerson!: DeliveryPerson | null

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date

  @OneToMany('OrderItem', 'order', { cascade: ['insert'] })
  items!: OrderItem[]

  @OneToMany('OrderStatusEvent', 'order', { cascade: ['insert'] })
  statusEvents!: OrderStatusEvent[]
}
