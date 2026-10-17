import 'reflect-metadata'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcrypt'
import { config as loadEnv } from 'dotenv'
import { dataSource } from './data-source'
import {
  DeliveryPerson,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusEvent,
  Product,
  ProductCategory,
  User,
  UserRole,
  VehicleType,
} from './entities'

loadEnv()

const BCRYPT_ROUNDS = 12

type SeedUser = {
  email: string
  password: string
  role: UserRole
}

type SeedProduct = {
  name: string
  description: string
  price: number
  category: ProductCategory
  imageUrl?: string
  isAvailable: boolean
  preparationTime: number
}

type SeedDeliveryPerson = {
  name: string
  phone: string
  vehicleType: VehicleType
  isActive: boolean
  currentLatitude: number
  currentLongitude: number
}

type SeedOrder = {
  customerName: string
  customerPhone: string
  deliveryAddress: string
  latitude: number
  longitude: number
  status: OrderStatus
  deliveryPersonIndex?: number
  items: Array<{ productIndex: number; quantity: number }>
}

type SeedFile = {
  users: SeedUser[]
  products: SeedProduct[]
  deliveryPersons: SeedDeliveryPerson[]
  orders: SeedOrder[]
}

const userRoles = new Set<string>(Object.values(UserRole))
const categories = new Set<string>(Object.values(ProductCategory))
const vehicles = new Set<string>(Object.values(VehicleType))
const statuses = new Set<string>(Object.values(OrderStatus))

function resolveSeedDataPath(): string {
  if (process.env.SEED_DATA_PATH) {
    return process.env.SEED_DATA_PATH
  }

  const candidates = [
    path.resolve(process.cwd(), '../seed/data.json'),
    path.resolve(process.cwd(), 'seed/data.json'),
    path.resolve(__dirname, '../../../../seed/data.json'),
    path.resolve(__dirname, '../../../../../seed/data.json'),
  ]
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) {
    throw new Error(`seed/data.json nao encontrado. Procurado em: ${candidates.join(', ')}`)
  }
  return found
}

function assertEnum<T extends string>(value: string, allowed: Set<string>, label: string): T {
  if (!allowed.has(value)) {
    throw new Error(`${label} invalido: ${value}`)
  }
  return value as T
}

function loadSeedFile(): SeedFile {
  const raw = JSON.parse(readFileSync(resolveSeedDataPath(), 'utf8')) as SeedFile
  return {
    users: raw.users.map((user) => ({
      ...user,
      role: assertEnum<UserRole>(user.role, userRoles, 'role'),
    })),
    products: raw.products.map((product) => ({
      ...product,
      category: assertEnum<ProductCategory>(product.category, categories, 'category'),
    })),
    deliveryPersons: raw.deliveryPersons.map((person) => ({
      ...person,
      vehicleType: assertEnum<VehicleType>(person.vehicleType, vehicles, 'vehicleType'),
    })),
    orders: raw.orders.map((order) => ({
      ...order,
      status: assertEnum<OrderStatus>(order.status, statuses, 'status'),
    })),
  }
}

async function main(): Promise<void> {
  const data = loadSeedFile()
  const users = await Promise.all(
    data.users.map(async (user) => ({
      email: user.email,
      role: user.role,
      password: await bcrypt.hash(user.password, BCRYPT_ROUNDS),
    })),
  )

  if (!dataSource.isInitialized) {
    await dataSource.initialize()
  }

  await dataSource.transaction(async (manager) => {
    await manager.query(
      `TRUNCATE TABLE order_status_events, order_items, orders, refresh_tokens, products, delivery_persons, users RESTART IDENTITY CASCADE`,
    )

    await manager.save(
      User,
      users.map((user) => manager.create(User, user)),
    )

    const products: Product[] = []
    for (const product of data.products) {
      products.push(
        await manager.save(
          Product,
          manager.create(Product, {
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            imageUrl: product.imageUrl ?? null,
            isAvailable: product.isAvailable,
            preparationTime: product.preparationTime,
          }),
        ),
      )
    }

    const couriers: DeliveryPerson[] = []
    for (const person of data.deliveryPersons) {
      couriers.push(
        await manager.save(
          DeliveryPerson,
          manager.create(DeliveryPerson, {
            name: person.name,
            phone: person.phone,
            vehicleType: person.vehicleType,
            isActive: person.isActive,
            currentLatitude: person.currentLatitude,
            currentLongitude: person.currentLongitude,
          }),
        ),
      )
    }

    for (const [index, order] of data.orders.entries()) {
      const createdAt = new Date(Date.now() - (data.orders.length - index) * 24 * 60 * 60 * 1000)
      let cents = 0
      const items = order.items.map((item) => {
        const product = data.products[item.productIndex]
        const savedProduct = products[item.productIndex]
        if (!product || !savedProduct) {
          throw new Error(`Pedido ${order.customerName} referencia productIndex ${item.productIndex} inexistente`)
        }
        cents += Math.round(product.price * 100) * item.quantity
        return manager.create(OrderItem, {
          product: savedProduct,
          quantity: item.quantity,
          unitPrice: product.price,
        })
      })

      const courier = order.deliveryPersonIndex === undefined ? null : couriers[order.deliveryPersonIndex]
      if (order.deliveryPersonIndex !== undefined && !courier) {
        throw new Error(`Pedido ${order.customerName} referencia deliveryPersonIndex inexistente`)
      }

      const deliveredAt = new Date(createdAt.getTime() + 40 * 60 * 1000)
      await manager.save(
        Order,
        manager.create(Order, {
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          deliveryAddress: order.deliveryAddress,
          latitude: order.latitude,
          longitude: order.longitude,
          status: order.status,
          totalAmount: cents / 100,
          deliveryPerson: courier,
          createdAt,
          items,
          statusEvents:
            order.status === OrderStatus.delivered
              ? [
                  manager.create(OrderStatusEvent, {
                    fromStatus: OrderStatus.delivering,
                    toStatus: OrderStatus.delivered,
                    createdAt: deliveredAt,
                  }),
                ]
              : [],
        }),
      )
    }
  })

  console.log(
    `Seed concluido: ${data.users.length} usuarios, ${data.products.length} produtos, ${data.deliveryPersons.length} entregadores, ${data.orders.length} pedidos.`,
  )
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy()
    }
  })
