import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { VehicleType } from '../../../domain/catalog.js'
import type { Order } from './order.entity.js'
import { enumValues, latitude, longitude } from './column-types.js'

@Entity('delivery_persons')
@Index('idx_delivery_persons_is_active', ['isActive'])
export class DeliveryPerson {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 100 })
  name!: string

  @Column({ type: 'varchar', length: 20 })
  phone!: string

  @Column({ type: 'enum', enum: enumValues(VehicleType), enumName: 'VehicleType', name: 'vehicle_type' })
  vehicleType!: VehicleType

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    name: 'current_lat',
    nullable: true,
    transformer: latitude,
  })
  currentLatitude!: number | null

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    name: 'current_lng',
    nullable: true,
    transformer: longitude,
  })
  currentLongitude!: number | null

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date

  @OneToMany('Order', 'deliveryPerson')
  orders!: Order[]
}
