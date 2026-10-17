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
import { OrderStatus, ProductCategory, UserRole, VehicleType } from '../../domain/catalog'
import { decimalTransformer } from './columns'

export { OrderStatus, ProductCategory, UserRole, VehicleType }

const money = decimalTransformer(2)
const latitude = decimalTransformer(8)
const longitude = decimalTransformer(8)

function values<T extends Record<string, string>>(record: T): Array<T[keyof T]> {
  return Object.values(record) as Array<T[keyof T]>
}

@Entity('users')
@Index('idx_users_email', ['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string

  @Column({ type: 'varchar', length: 255 })
  password!: string

  @Column({ type: 'enum', enum: values(UserRole), enumName: 'UserRole' })
  role!: UserRole

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens!: RefreshToken[]
}

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

  @Column({ type: 'enum', enum: values(ProductCategory), enumName: 'ProductCategory' })
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

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems!: OrderItem[]
}

@Entity('delivery_persons')
@Index('idx_delivery_persons_is_active', ['isActive'])
export class DeliveryPerson {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 100 })
  name!: string

  @Column({ type: 'varchar', length: 20 })
  phone!: string

  @Column({ type: 'enum', enum: values(VehicleType), enumName: 'VehicleType', name: 'vehicle_type' })
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

  @OneToMany(() => Order, (order) => order.deliveryPerson)
  orders!: Order[]
}

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

  @Column({ type: 'enum', enum: values(OrderStatus), enumName: 'OrderStatus', default: OrderStatus.pending })
  status!: OrderStatus

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount', transformer: money })
  totalAmount!: number

  @ManyToOne(() => DeliveryPerson, (person) => person.orders, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'delivery_person_id' })
  deliveryPerson!: DeliveryPerson | null

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: ['insert'] })
  items!: OrderItem[]

  @OneToMany(() => OrderStatusEvent, (event) => event.order, { cascade: ['insert'] })
  statusEvents!: OrderStatusEvent[]
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order

  @ManyToOne(() => Product, (product) => product.orderItems, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product!: Product

  @Column({ type: 'int' })
  quantity!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price', transformer: money })
  unitPrice!: number

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date
}

@Entity('refresh_tokens')
@Index('idx_refresh_tokens_user_id', ['user'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
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

@Entity('order_status_events')
@Index('idx_order_status_events_order_status', ['order', 'toStatus'])
export class OrderStatusEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => Order, (order) => order.statusEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order

  @Column({ type: 'enum', enum: values(OrderStatus), enumName: 'OrderStatus', name: 'from_status', nullable: true })
  fromStatus!: OrderStatus | null

  @Column({ type: 'enum', enum: values(OrderStatus), enumName: 'OrderStatus', name: 'to_status' })
  toStatus!: OrderStatus

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date
}
