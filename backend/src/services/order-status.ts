import { OrderStatus } from '../database/entities'
import { AppError } from '../utils/errors'

const nextStatuses: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivering', 'cancelled'],
  delivering: ['delivered'],
  delivered: [],
  cancelled: [],
}

export function assertStatusTransition(from: OrderStatus, to: OrderStatus, hasDeliveryPerson: boolean): void {
  if (!nextStatuses[from].includes(to)) {
    throw new AppError(
      422,
      'INVALID_STATUS_TRANSITION',
      `Nao e possivel alterar o status de '${from}' para '${to}'`,
    )
  }

  if (to === 'delivering' && !hasDeliveryPerson) {
    throw new AppError(
      422,
      'INVALID_STATUS_TRANSITION',
      "Nao e possivel alterar o status de 'ready' para 'delivering' sem um entregador atribuido",
    )
  }
}
