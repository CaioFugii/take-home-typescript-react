import type { DeliveryTimeQuery, RevenueQuery, TopProductsQuery } from '../routes/schemas/report.schema'
import { OrderStatus, type VehicleType } from '../domain/catalog'
import { repositories } from '../context'
import { utcNextDay, utcStart } from '../utils/dates'

const statuses = [
  OrderStatus.pending,
  OrderStatus.preparing,
  OrderStatus.ready,
  OrderStatus.delivering,
  OrderStatus.delivered,
  OrderStatus.cancelled,
] as const

const vehicles: readonly VehicleType[] = ['bicycle', 'motorcycle', 'car']

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export async function getRevenue(query: RevenueQuery): Promise<{
  startDate: string
  endDate: string
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>
}> {
  const orders = await repositories().reports.listDelivered(utcStart(query.startDate), utcNextDay(query.endDate))

  const byDay = new Map<string, { cents: number; orders: number }>()
  let cents = 0
  for (const order of orders) {
    const amount = Math.round(order.totalAmount * 100)
    cents += amount
    const date = order.createdAt.toISOString().slice(0, 10)
    const bucket = byDay.get(date) ?? { cents: 0, orders: 0 }
    bucket.cents += amount
    bucket.orders += 1
    byDay.set(date, bucket)
  }

  const totalRevenue = roundMoney(cents / 100)
  return {
    startDate: query.startDate,
    endDate: query.endDate,
    totalRevenue,
    totalOrders: orders.length,
    averageOrderValue: orders.length === 0 ? 0 : roundMoney(totalRevenue / orders.length),
    dailyRevenue: [...byDay.entries()].map(([date, bucket]) => ({
      date,
      revenue: roundMoney(bucket.cents / 100),
      orders: bucket.orders,
    })),
  }
}

export async function getOrdersByStatus(): Promise<{
  data: Array<{ status: OrderStatus; count: number }>
  total: number
}> {
  const grouped = await repositories().reports.countByStatus()
  const counts = new Map(grouped.map((row) => [row.status, row.count]))
  const data = statuses.map((status) => ({ status, count: counts.get(status) ?? 0 }))
  return { data, total: data.reduce((sum, row) => sum + row.count, 0) }
}

export async function getTopProducts(query: TopProductsQuery): Promise<{
  data: Array<{ productId: string; productName: string; totalQuantity: number; totalRevenue: number }>
}> {
  const rows = await repositories().reports.topProducts(
    {
      start: query.startDate ? utcStart(query.startDate) : undefined,
      end: query.endDate ? utcNextDay(query.endDate) : undefined,
    },
    query.limit,
  )

  return {
    data: rows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      totalQuantity: row.totalQuantity,
      totalRevenue: roundMoney(row.totalRevenue),
    })),
  }
}

export async function getAverageDeliveryTime(query: DeliveryTimeQuery): Promise<{
  averageMinutes: number | null
  fastestMinutes: number | null
  slowestMinutes: number | null
  totalDelivered: number
  byVehicleType: Array<{ vehicleType: VehicleType; averageMinutes: number; count: number }>
}> {
  const rows = await repositories().reports.deliveryTimes({
    start: query.startDate ? utcStart(query.startDate) : undefined,
    end: query.endDate ? utcNextDay(query.endDate) : undefined,
  })

  if (rows.length === 0) {
    return {
      averageMinutes: null,
      fastestMinutes: null,
      slowestMinutes: null,
      totalDelivered: 0,
      byVehicleType: [],
    }
  }

  const minutes = rows.map((row) => row.minutes)
  const average = minutes.reduce((sum, value) => sum + value, 0) / minutes.length
  const byVehicle = new Map<VehicleType, number[]>()
  for (const row of rows) {
    if (!row.vehicleType || !vehicles.includes(row.vehicleType)) {
      continue
    }
    const bucket = byVehicle.get(row.vehicleType) ?? []
    bucket.push(row.minutes)
    byVehicle.set(row.vehicleType, bucket)
  }

  return {
    averageMinutes: Math.round(average * 10) / 10,
    fastestMinutes: Math.round(Math.min(...minutes)),
    slowestMinutes: Math.round(Math.max(...minutes)),
    totalDelivered: rows.length,
    byVehicleType: vehicles.flatMap((vehicleType) => {
      const values = byVehicle.get(vehicleType)
      if (!values || values.length === 0) {
        return []
      }
      const vehicleAverage = values.reduce((sum, value) => sum + value, 0) / values.length
      return [{ vehicleType, averageMinutes: Math.round(vehicleAverage * 10) / 10, count: values.length }]
    }),
  }
}
