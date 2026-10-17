import { OrderStatus } from './catalog'
import { DomainError, type ErrorDetail } from './errors'

export type CatalogProduct = {
  id: string
  name: string
  price: number
  isAvailable: boolean
}

export type RequestedItem = {
  productId: string
  quantity: number
}

export type PricedLine = {
  productId: string
  quantity: number
  unitPrice: number
}

export function unavailableItems(items: RequestedItem[], catalog: CatalogProduct[]): ErrorDetail[] {
  const byId = new Map(catalog.map((product) => [product.id, product]))
  const problems: ErrorDetail[] = []

  for (const item of items) {
    const product = byId.get(item.productId)
    if (!product) {
      problems.push({ productId: item.productId, reason: 'Produto nao encontrado' })
      continue
    }
    if (!product.isAvailable) {
      problems.push({ productId: product.id, productName: product.name, reason: 'Produto indisponivel' })
    }
  }

  return problems
}

export function priceOrder(items: RequestedItem[], catalog: CatalogProduct[]): {
  totalAmount: number
  lines: PricedLine[]
} {
  const byId = new Map(catalog.map((product) => [product.id, product]))
  let cents = 0
  const lines = items.map((item) => {
    const product = byId.get(item.productId)
    if (!product) {
      throw new DomainError('UNAVAILABLE_PRODUCT', 'Um ou mais produtos nao estao disponiveis')
    }
    const unitCents = Math.round(product.price * 100)
    cents += unitCents * item.quantity
    return { productId: product.id, quantity: item.quantity, unitPrice: unitCents / 100 }
  })

  return { totalAmount: cents / 100, lines }
}

export function assertProductCanBeRemoved(linkedToOpenOrder: boolean): void {
  if (linkedToOpenOrder) {
    throw new DomainError(
      'PRODUCT_IN_USE',
      "Nao e possivel deletar este produto pois ele esta vinculado a pedidos com status 'pending' ou 'preparing'",
    )
  }
}

export function assertOrderCanReceiveCourier(status: OrderStatus): void {
  if (status === OrderStatus.delivered || status === OrderStatus.cancelled) {
    throw new DomainError(
      'INVALID_STATUS_TRANSITION',
      `Nao e possivel atribuir entregador a um pedido '${status}'`,
    )
  }
}

export function assertCourierCanDeliver(isActive: boolean, alreadyDelivering: boolean): void {
  if (!isActive) {
    throw new DomainError('DELIVERY_PERSON_UNAVAILABLE', 'Este entregador nao esta ativo')
  }
  if (alreadyDelivering) {
    throw new DomainError(
      'DELIVERY_PERSON_UNAVAILABLE',
      'Este entregador ja esta atribuido a outro pedido em andamento',
    )
  }
}

export function assertCourierCanBeRemoved(onActiveDelivery: boolean): void {
  if (onActiveDelivery) {
    throw new DomainError(
      'DELIVERY_PERSON_IN_USE',
      'Nao e possivel remover este entregador pois ele esta atribuido a um pedido em entrega',
    )
  }
}
