import type { DataSource } from 'typeorm'
import type { OrderStatus, VehicleType } from '../../domain/catalog'
import type {
  DatePeriod,
  DeliveredOrderAmount,
  DeliveryTimeRow,
  ReportRepository,
  StatusCount,
  TopProductRow,
} from '../../domain/report-repository'
import { Order, OrderStatus as Status } from './entities'

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

function deliveredPeriod(period: DatePeriod): { sql: string; params: unknown[] } {
  const filters = [`o.status = 'delivered'::"OrderStatus"`]
  const params: unknown[] = []
  if (period.start) {
    params.push(period.start)
    filters.push(`o.created_at >= $${params.length}`)
  }
  if (period.end) {
    params.push(period.end)
    filters.push(`o.created_at < $${params.length}`)
  }
  return { sql: filters.join(' AND '), params }
}

export class TypeOrmReportRepository implements ReportRepository {
  constructor(private readonly dataSource: DataSource) {}

  async listDelivered(start: Date, end: Date): Promise<DeliveredOrderAmount[]> {
    const orders = await this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .where('order.status = :status', { status: Status.delivered })
      .andWhere('order.createdAt >= :start', { start })
      .andWhere('order.createdAt < :end', { end })
      .orderBy('order.createdAt', 'ASC')
      .getMany()

    return orders.map((order) => ({ totalAmount: order.totalAmount, createdAt: order.createdAt }))
  }

  async countByStatus(): Promise<StatusCount[]> {
    const grouped = await this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany<{ status: OrderStatus; count: string }>()

    return grouped.map((row) => ({ status: row.status, count: asNumber(row.count) }))
  }

  async topProducts(period: DatePeriod, limit: number): Promise<TopProductRow[]> {
    const filter = deliveredPeriod(period)
    const limitPosition = filter.params.length + 1
    const rows = await this.dataSource.query<
      Array<{ product_id: string; product_name: string; total_quantity: unknown; total_revenue: unknown }>
    >(
      `SELECT p.id AS product_id,
              p.name AS product_name,
              SUM(oi.quantity)::int AS total_quantity,
              SUM(oi.quantity * oi.unit_price) AS total_revenue
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       INNER JOIN products p ON p.id = oi.product_id
       WHERE ${filter.sql}
       GROUP BY p.id, p.name
       ORDER BY SUM(oi.quantity) DESC, p.name ASC
       LIMIT $${limitPosition}`,
      [...filter.params, limit],
    )

    return rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      totalQuantity: asNumber(row.total_quantity),
      totalRevenue: asNumber(row.total_revenue),
    }))
  }

  async deliveryTimes(period: DatePeriod): Promise<DeliveryTimeRow[]> {
    const filter = deliveredPeriod(period)
    const rows = await this.dataSource.query<Array<{ minutes: unknown; vehicle_type: VehicleType | null }>>(
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
       WHERE ${filter.sql}`,
      filter.params,
    )

    return rows.map((row) => ({ minutes: asNumber(row.minutes), vehicleType: row.vehicle_type }))
  }
}
