import type { DeliveryTimeQuery, RevenueQuery, TopProductsQuery } from '../routes/report.schema'
import { dataSource } from '../database/data-source'
import { Order, OrderStatus, type VehicleType } from '../database/entities'
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

type Period = {
  startDate?: string
  endDate?: string
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'bigint') {
    return Number(value)
  }
  if (typeof value === 'string') {
    return Number(value)
  }
  return Number.NaN
}

function periodFilter(period: Period): { sql: string; params: unknown[] } {
  const filters = [`o.status = 'delivered'::"OrderStatus"`]
  const params: unknown[] = []
  if (period.startDate) {
    params.push(utcStart(period.startDate))
    filters.push(`o.created_at >= $${params.length}`)
  }
  if (period.endDate) {
    params.push(utcNextDay(period.endDate))
    filters.push(`o.created_at < $${params.length}`)
  }
  return { sql: filters.join(' AND '), params }
}

export async function getRevenue(query: RevenueQuery): Promise<{
  startDate: string
  endDate: string
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>
}> {
  const orders = await dataSource
    .getRepository(Order)
    .createQueryBuilder('order')
    .where('order.status = :status', { status: OrderStatus.delivered })
    .andWhere('order.createdAt >= :start', { start: utcStart(query.startDate) })
    .andWhere('order.createdAt < :end', { end: utcNextDay(query.endDate) })
    .orderBy('order.createdAt', 'ASC')
    .getMany()

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
  const grouped = await dataSource
    .getRepository(Order)
    .createQueryBuilder('order')
    .select('order.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('order.status')
    .getRawMany<{ status: OrderStatus; count: string }>()
  const counts = new Map(grouped.map((row) => [row.status, asNumber(row.count)]))
  const data = statuses.map((status) => ({ status, count: counts.get(status) ?? 0 }))
  return { data, total: data.reduce((sum, row) => sum + row.count, 0) }
}

export async function getTopProducts(query: TopProductsQuery): Promise<{
  data: Array<{ productId: string; productName: string; totalQuantity: number; totalRevenue: number }>
}> {
  const period = periodFilter(query)
  const limitPosition = period.params.length + 1
  const rows = await dataSource.query<
    Array<{ product_id: string; product_name: string; total_quantity: unknown; total_revenue: unknown }>
  >(
    `SELECT p.id AS product_id,
            p.name AS product_name,
            SUM(oi.quantity)::int AS total_quantity,
            SUM(oi.quantity * oi.unit_price) AS total_revenue
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     INNER JOIN products p ON p.id = oi.product_id
     WHERE ${period.sql}
     GROUP BY p.id, p.name
     ORDER BY SUM(oi.quantity) DESC, p.name ASC
     LIMIT $${limitPosition}`,
    [...period.params, query.limit],
  )

  return {
    data: rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      totalQuantity: asNumber(row.total_quantity),
      totalRevenue: roundMoney(asNumber(row.total_revenue)),
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
  const period = periodFilter(query)
  const rows = await dataSource.query<Array<{ minutes: unknown; vehicle_type: VehicleType | null }>>(
    `SELECT EXTRACT(EPOCH FROM (delivered.created_at - o.created_at)) / 60.0 AS minutes,
            dp.vehicle_type
     FROM orders o
     INNER JOIN LATERAL (
       SELECT e.created_at
       FROM order_status_events e
       WHERE e.order_id = o.id AND e.to_status = 'delivered'::"OrderStatus"
       ORDER BY e.created_at ASC
       LIMIT 1
     ) delivered ON true
     LEFT JOIN delivery_persons dp ON dp.id = o.delivery_person_id
     WHERE ${period.sql}`,
    period.params,
  )

  if (rows.length === 0) {
    return {
      averageMinutes: null,
      fastestMinutes: null,
      slowestMinutes: null,
      totalDelivered: 0,
      byVehicleType: [],
    }
  }

  const minutes = rows.map((row) => asNumber(row.minutes))
  const average = minutes.reduce((sum, value) => sum + value, 0) / minutes.length
  const byVehicle = new Map<VehicleType, number[]>()
  for (const row of rows) {
    if (!row.vehicle_type || !vehicles.includes(row.vehicle_type)) {
      continue
    }
    const bucket = byVehicle.get(row.vehicle_type) ?? []
    bucket.push(asNumber(row.minutes))
    byVehicle.set(row.vehicle_type, bucket)
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
