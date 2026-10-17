import type { OrderStatus, VehicleType } from './catalog'

export type OrderItemRecord = {
  id: string
  product: { id: string; name: string }
  quantity: number
  unitPrice: number
}

export type OrderCourier = {
  id: string
  name: string
  phone: string
  vehicleType: VehicleType
}

export type OrderRecord = {
  id: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  latitude: number
  longitude: number
  status: OrderStatus
  totalAmount: number
  deliveryPerson: OrderCourier | null
  items: OrderItemRecord[]
  createdAt: Date
  updatedAt: Date
}

export type OrderListQuery = {
  page: number
  limit: number
  status?: OrderStatus
  start?: Date
  end?: Date
  sortBy: 'createdAt' | 'totalAmount'
  sortOrder: 'asc' | 'desc'
}

export type NewOrder = {
  customerName: string
  customerPhone: string
  deliveryAddress: string
  latitude: number
  longitude: number
  totalAmount: number
  items: Array<{ productId: string; quantity: number; unitPrice: number }>
}

export type ReadyOrder = {
  id: string
  address: string
  latitude: number
  longitude: number
}

export interface OrderRepository {
  list(query: OrderListQuery): Promise<{ data: OrderRecord[]; total: number }>
  findById(id: string): Promise<OrderRecord | null>
  create(input: NewOrder): Promise<OrderRecord>
  changeStatus(id: string, status: OrderStatus): Promise<OrderRecord | null>
  assignCourier(orderId: string, deliveryPersonId: string): Promise<void>
  listReady(): Promise<ReadyOrder[]>
  isCourierDelivering(deliveryPersonId: string, exceptOrderId?: string): Promise<boolean>
}
