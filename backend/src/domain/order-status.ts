import { OrderStatus } from './catalog'
import { DomainError } from './errors'

const nextStatuses: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: [OrderStatus.preparing, OrderStatus.cancelled],
  preparing: [OrderStatus.ready, OrderStatus.cancelled],
  ready: [OrderStatus.delivering, OrderStatus.cancelled],
  delivering: [OrderStatus.delivered],
  delivered: [],
  cancelled: [],
}

export function assertStatusTransition(from: OrderStatus, to: OrderStatus, hasDeliveryPerson: boolean): void {
  if (!nextStatuses[from].includes(to)) {
    throw new DomainError(
      'INVALID_STATUS_TRANSITION',
      `Nao e possivel alterar o status de '${from}' para '${to}'`,
    )
  }

  if (to === OrderStatus.delivering && !hasDeliveryPerson) {
    throw new DomainError(
      'INVALID_STATUS_TRANSITION',
      "Nao e possivel alterar o status de 'ready' para 'delivering' sem um entregador atribuido",
    )
  }
}
