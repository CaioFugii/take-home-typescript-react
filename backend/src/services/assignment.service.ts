import { optimizeAssignment, type AssignmentPlan } from '../algorithms/optimize-assignment'
import { dataSource } from '../database/data-source'
import { DeliveryPerson, Order, OrderStatus } from '../database/entities'

export type AssignmentResponse = AssignmentPlan & {
  executionTimeMs: number
}

export async function suggestOptimizedAssignment(): Promise<AssignmentResponse> {
  const orders = await dataSource.getRepository(Order).find({
    where: { status: OrderStatus.ready },
    order: { createdAt: 'ASC' },
  })
  const couriers = await dataSource
    .getRepository(DeliveryPerson)
    .createQueryBuilder('person')
    .leftJoin('person.orders', 'activeOrder', 'activeOrder.status = :delivering', { delivering: OrderStatus.delivering })
    .where('person.isActive = true')
    .andWhere('person.currentLatitude IS NOT NULL')
    .andWhere('person.currentLongitude IS NOT NULL')
    .andWhere('activeOrder.id IS NULL')
    .orderBy('person.name', 'ASC')
    .getMany()

  const started = performance.now()
  const plan = optimizeAssignment(
    orders.map((order) => ({
      id: order.id,
      address: order.deliveryAddress,
      latitude: order.latitude,
      longitude: order.longitude,
    })),
    couriers.flatMap((courier) => {
      if (courier.currentLatitude === null || courier.currentLongitude === null) {
        return []
      }
      return [
        {
          id: courier.id,
          name: courier.name,
          latitude: courier.currentLatitude,
          longitude: courier.currentLongitude,
        },
      ]
    }),
  )

  return {
    ...plan,
    executionTimeMs: Math.max(0, Math.round(performance.now() - started)),
  }
}
