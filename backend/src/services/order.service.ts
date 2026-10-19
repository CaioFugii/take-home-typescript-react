import type { CreateOrderInput, ListOrdersQuery } from '../routes/schemas/order.schema'
import type { OrderStatus, VehicleType } from '../domain/catalog'
import { DomainError } from '../domain/errors'
import type { OrderRecord } from '../domain/repositories/order-repository'
import { priceOrder, unavailableItems } from '../domain/rules'
import { repositories } from '../context'
import { utcNextDay, utcStart } from '../utils/dates'

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

function toOrderDto(order: OrderRecord): OrderDto {
  return {
    id: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    latitude: order.latitude,
    longitude: order.longitude,
    status: order.status,
    totalAmount: order.totalAmount,
    deliveryPerson: order.deliveryPerson,
    items: order.items.map((item) => ({
      id: item.id,
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }
}

async function requireOrder(id: string): Promise<OrderRecord> {
  const order = await repositories().orders.findById(id)
  if (!order) {
    throw new DomainError('ORDER_NOT_FOUND', 'Pedido nao encontrado')
  }
  return order
}

export async function listOrders(query: ListOrdersQuery): Promise<{
  data: OrderDto[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}> {
  const result = await repositories().orders.list({
    page: query.page,
    limit: query.limit,
    status: query.status,
    start: query.startDate ? utcStart(query.startDate) : undefined,
    end: query.endDate ? utcNextDay(query.endDate) : undefined,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  })

  return {
    data: result.data.map(toOrderDto),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / query.limit),
    },
  }
}

export async function getOrder(id: string): Promise<OrderDto> {
  return toOrderDto(await requireOrder(id))
}

export async function createOrder(input: CreateOrderInput): Promise<OrderDto> {
  const catalog = await repositories().products.findByIds(input.items.map((item) => item.productId))
  const problems = unavailableItems(input.items, catalog)
  if (problems.length > 0) {
    throw new DomainError('UNAVAILABLE_PRODUCT', 'Um ou mais produtos nao estao disponiveis', problems)
  }

  const priced = priceOrder(input.items, catalog)
  const saved = await repositories().orders.create({
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    deliveryAddress: input.deliveryAddress,
    latitude: Number(input.latitude.toFixed(8)),
    longitude: Number(input.longitude.toFixed(8)),
    totalAmount: priced.totalAmount,
    items: priced.lines,
  })
  return toOrderDto(saved)
}

export async function changeOrderStatus(id: string, status: OrderStatus): Promise<OrderDto> {
  const changed = await repositories().orders.changeStatus(id, status)
  if (!changed) {
    throw new DomainError('ORDER_NOT_FOUND', 'Pedido nao encontrado')
  }
  return toOrderDto(changed)
}

export async function assignDeliveryPerson(orderId: string, deliveryPersonId: string): Promise<OrderDto> {
  await repositories().orders.assignCourier(orderId, deliveryPersonId)
  return toOrderDto(await requireOrder(orderId))
}
