import { optimizeAssignment, type AssignmentPlan } from '../algorithms/optimize-assignment'
import { repositories } from '../context'

export type AssignmentResponse = AssignmentPlan & {
  executionTimeMs: number
}

export async function suggestOptimizedAssignment(): Promise<AssignmentResponse> {
  const orders = await repositories().orders.listReady()
  const couriers = await repositories().deliveryPersons.listAvailableForAssignment()

  const started = performance.now()
  const plan = optimizeAssignment(
    orders.map((order) => ({
      id: order.id,
      address: order.address,
      latitude: order.latitude,
      longitude: order.longitude,
    })),
    couriers.map((courier) => ({
      id: courier.id,
      name: courier.name,
      latitude: courier.latitude,
      longitude: courier.longitude,
    })),
  )

  return {
    ...plan,
    executionTimeMs: Math.max(0, Math.round(performance.now() - started)),
  }
}
