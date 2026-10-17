import type { OrderStatus, VehicleType } from './catalog'

export type DeliveredOrderAmount = {
  totalAmount: number
  createdAt: Date
}

export type StatusCount = {
  status: OrderStatus
  count: number
}

export type TopProductRow = {
  productId: string
  productName: string
  totalQuantity: number
  totalRevenue: number
}

export type DeliveryTimeRow = {
  minutes: number
  vehicleType: VehicleType | null
}

export type DatePeriod = {
  start?: Date
  end?: Date
}

export interface ReportRepository {
  listDelivered(start: Date, end: Date): Promise<DeliveredOrderAmount[]>
  countByStatus(): Promise<StatusCount[]>
  topProducts(period: DatePeriod, limit: number): Promise<TopProductRow[]>
  deliveryTimes(period: DatePeriod): Promise<DeliveryTimeRow[]>
}
