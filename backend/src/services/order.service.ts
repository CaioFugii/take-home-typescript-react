import type { EntityManager } from 'typeorm'
import { And, FindOptionsWhere, LessThan, MoreThanOrEqual } from 'typeorm'
import type { CreateOrderInput, ListOrdersQuery } from '../routes/order.schema'
import { dataSource } from '../database/data-source'
import { DeliveryPerson, Order, OrderItem, OrderStatus, OrderStatusEvent, Product, type VehicleType } from '../database/entities'
import { utcNextDay, utcStart } from '../utils/dates'
import { AppError, type ErrorDetail } from '../utils/errors'
import { assertStatusTransition } from './order-status'

const orderRelations = { items: { product: true }, deliveryPerson: true } as const

export type OrderDto = {
  id: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  latitude: number
  longitude: number
  status: OrderStatus
  totalAmount: number
  deliveryPerson: {
    id: string
    name: string
    phone: string
    vehicleType: VehicleType
  } | null
  items: Array<{
    id: string
    product: { id: string; name: string }
    quantity: number
    unitPrice: number
  }>
  createdAt: string
  updatedAt: string
}

function toOrderDto(order: Order): OrderDto {
  const items = [...order.items].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
  return {
    id: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    latitude: order.latitude,
    longitude: order.longitude,
    status: order.status,
    totalAmount: order.totalAmount,
    deliveryPerson: order.deliveryPerson
      ? {
          id: order.deliveryPerson.id,
          name: order.deliveryPerson.name,
          phone: order.deliveryPerson.phone,
          vehicleType: order.deliveryPerson.vehicleType,
        }
      : null,
    items: items.map((item) => ({
      id: item.id,
      product: { id: item.product.id, name: item.product.name },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }
}

async function loadOrder(manager: EntityManager, id: string): Promise<Order> {
  const order = await manager.findOne(Order, { where: { id }, relations: orderRelations })
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido nao encontrado')
  }
  return order
}

export async function listOrders(query: ListOrdersQuery): Promise<{
  data: OrderDto[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}> {
  const createdAt =
    query.startDate && query.endDate
      ? And(MoreThanOrEqual(utcStart(query.startDate)), LessThan(utcNextDay(query.endDate)))
      : query.startDate
        ? MoreThanOrEqual(utcStart(query.startDate))
        : query.endDate
          ? LessThan(utcNextDay(query.endDate))
          : undefined

  const where: FindOptionsWhere<Order> = {
    ...(query.status ? { status: query.status } : {}),
    ...(createdAt ? { createdAt } : {}),
  }

  const [orders, total] = await dataSource.getRepository(Order).findAndCount({
    where,
    relations: orderRelations,
    order: {
      [query.sortBy]: query.sortOrder,
      items: { createdAt: 'ASC' },
    },
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })

  return {
    data: orders.map(toOrderDto),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  }
}

export async function getOrder(id: string): Promise<OrderDto> {
  return toOrderDto(await loadOrder(dataSource.manager, id))
}

export async function createOrder(input: CreateOrderInput): Promise<OrderDto> {
  const productIds = input.items.map((item) => item.productId)
  const products = await dataSource.getRepository(Product).find({ where: productIds.map((id) => ({ id })) })
  const byId = new Map(products.map((product) => [product.id, product]))
  const problems: ErrorDetail[] = []

  for (const item of input.items) {
    const product = byId.get(item.productId)
    if (!product) {
      problems.push({ productId: item.productId, reason: 'Produto nao encontrado' })
      continue
    }
    if (!product.isAvailable) {
      problems.push({ productId: product.id, productName: product.name, reason: 'Produto indisponivel' })
    }
  }

  if (problems.length > 0) {
    throw new AppError(422, 'UNAVAILABLE_PRODUCT', 'Um ou mais produtos nao estao disponiveis', problems)
  }

  let cents = 0
  const items = input.items.map((item) => {
    const product = byId.get(item.productId)
    if (!product) {
      throw new AppError(422, 'UNAVAILABLE_PRODUCT', 'Um ou mais produtos nao estao disponiveis')
    }
    const unitCents = Math.round(product.price * 100)
    cents += unitCents * item.quantity
    return { product, quantity: item.quantity, unitPrice: unitCents / 100 }
  })

  const saved = await dataSource.transaction(async (manager) => {
    const order = manager.create(Order, {
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      deliveryAddress: input.deliveryAddress,
      latitude: Number(input.latitude.toFixed(8)),
      longitude: Number(input.longitude.toFixed(8)),
      status: OrderStatus.pending,
      totalAmount: cents / 100,
      deliveryPerson: null,
      items: items.map((item) => manager.create(OrderItem, item)),
      statusEvents: [manager.create(OrderStatusEvent, { fromStatus: null, toStatus: OrderStatus.pending })],
    })
    return manager.save(order)
  })

  return toOrderDto(await loadOrder(dataSource.manager, saved.id))
}

export async function changeOrderStatus(id: string, status: OrderStatus): Promise<OrderDto> {
  await dataSource.transaction(async (manager) => {
    const current = await manager.findOne(Order, { where: { id }, relations: { deliveryPerson: true } })
    if (!current) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido nao encontrado')
    }
    assertStatusTransition(current.status, status, current.deliveryPerson !== null)
    const fromStatus = current.status
    current.status = status
    await manager.save(current)
    await manager.save(manager.create(OrderStatusEvent, { order: current, fromStatus, toStatus: status }))
  })
  return toOrderDto(await loadOrder(dataSource.manager, id))
}

export async function assignDeliveryPerson(orderId: string, deliveryPersonId: string): Promise<OrderDto> {
  await dataSource.transaction(async (manager) => {
    const current = await manager.findOne(Order, { where: { id: orderId } })
    if (!current) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido nao encontrado')
    }
    if (current.status === OrderStatus.delivered || current.status === OrderStatus.cancelled) {
      throw new AppError(
        422,
        'INVALID_STATUS_TRANSITION',
        `Nao e possivel atribuir entregador a um pedido '${current.status}'`,
      )
    }

    const person = await manager.findOne(DeliveryPerson, { where: { id: deliveryPersonId } })
    if (!person) {
      throw new AppError(404, 'DELIVERY_PERSON_NOT_FOUND', 'Entregador nao encontrado')
    }
    if (!person.isActive) {
      throw new AppError(422, 'DELIVERY_PERSON_UNAVAILABLE', 'Este entregador nao esta ativo')
    }

    const busy = await manager
      .createQueryBuilder(Order, 'order')
      .innerJoin('order.deliveryPerson', 'person')
      .where('person.id = :deliveryPersonId', { deliveryPersonId })
      .andWhere('order.status = :status', { status: OrderStatus.delivering })
      .andWhere('order.id <> :orderId', { orderId })
      .getOne()
    if (busy) {
      throw new AppError(
        422,
        'DELIVERY_PERSON_UNAVAILABLE',
        'Este entregador ja esta atribuido a outro pedido em andamento',
      )
    }

    current.deliveryPerson = person
    await manager.save(current)
  })
  return toOrderDto(await loadOrder(dataSource.manager, orderId))
}
