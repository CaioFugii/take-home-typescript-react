import { describe, expect, it } from 'vitest'
import { haversineKm } from '../src/algorithms/haversine'
import { hungarian } from '../src/algorithms/hungarian'
import { optimizeAssignment } from '../src/algorithms/optimize-assignment'

describe('atribuicao otimizada', () => {
  it('calcula a distancia de Haversine', () => {
    expect(haversineKm(0, 0, 0, 0)).toBeCloseTo(0, 6)
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.1949, 3)
  })

  it('escolhe o emparelhamento de custo minimo, nao o vizinho mais proximo', () => {
    const columns = hungarian([
      [1, 2],
      [1.5, 100],
    ])
    expect(columns).toEqual([1, 0])

    const plan = optimizeAssignment(
      [
        { id: 'order-a', address: 'Rua A, 10', latitude: 0, longitude: 0 },
        { id: 'order-b', address: 'Rua B, 20', latitude: 0, longitude: 1 },
      ],
      [
        { id: 'courier-near-b', name: 'Perto de B', latitude: 0, longitude: 1 },
        { id: 'courier-far', name: 'Longe', latitude: 10, longitude: 10 },
      ],
    )
    const total = plan.assignments.reduce((sum, item) => sum + item.estimatedDistanceKm, 0)
    expect(plan.assignments).toHaveLength(2)
    expect(new Set(plan.assignments.map((item) => item.deliveryPersonId)).size).toBe(2)
    expect(plan.totalDistanceKm).toBeCloseTo(Math.round(total * 100) / 100, 2)
    expect(plan.algorithm).toBe('hungarian')
  })

  it('devolve os pedidos sem entregador quando ninguem esta disponivel', () => {
    const plan = optimizeAssignment(
      [{ id: 'order-a', address: 'Rua A, 10', latitude: -23.55, longitude: -46.63 }],
      [],
    )
    expect(plan.assignments).toEqual([])
    expect(plan.totalDistanceKm).toBe(0)
    expect(plan.unassigned).toEqual([
      { orderId: 'order-a', orderAddress: 'Rua A, 10', reason: 'No available delivery person' },
    ])
  })
})
