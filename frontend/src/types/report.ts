import type { OrderStatus } from './order'
import type { VehicleType } from './delivery-person'

export type DailyRevenue = {
  date: string
  revenue: number
  orders: number
}

export type RevenueReport = {
  startDate: string
  endDate: string
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  dailyRevenue: DailyRevenue[]
}

export type StatusCount = {
  status: OrderStatus
  count: number
}

export type StatusReport = {
  data: StatusCount[]
  total: number
}

export type TopProduct = {
  productId: string
  productName: string
  totalQuantity: number
  totalRevenue: number
}

export type DeliveryTimeReport = {
  averageMinutes: number | null
  fastestMinutes: number | null
  slowestMinutes: number | null
  totalDelivered: number
  byVehicleType: Array<{
    vehicleType: VehicleType
    averageMinutes: number
    count: number
  }>
}
