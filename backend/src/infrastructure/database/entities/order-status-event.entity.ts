import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { OrderStatus } from '../../../domain/catalog.js'
import { enumValues } from './column-types.js'
import type { Order } from './order.entity.js'

@Entity('order_status_events')
@Index('idx_order_status_events_order_status', ['order', 'toStatus'])
export class OrderStatusEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne('Order', 'statusEvents', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order

  @Column({ type: 'enum', enum: enumValues(OrderStatus), enumName: 'OrderStatus', name: 'from_status', nullable: true })
  fromStatus!: OrderStatus | null

  @Column({ type: 'enum', enum: enumValues(OrderStatus), enumName: 'OrderStatus', name: 'to_status' })
  toStatus!: OrderStatus

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date
}
