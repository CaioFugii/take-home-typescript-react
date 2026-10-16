export const orderStatuses = ['pending', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'] as const

export type OrderStatus = (typeof orderStatuses)[number]

export const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pendente',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivering: 'Em entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

export const statusClasses: Record<OrderStatus, string> = {
  pending: 'bg-[#f8e7c8] text-[#8a5a12]',
  preparing: 'bg-[#f3ddcf] text-[#9a3412]',
  ready: 'bg-[#e5f2ea] text-[#1b3329]',
  delivering: 'bg-[#fde8e1] text-[#9a3412]',
  delivered: 'bg-[#dfe8e3] text-[#1b3329]',
  cancelled: 'bg-[#ece7df] text-[#6d6256]',
}

export const transitionLabels: Record<OrderStatus, string> = {
  pending: 'Voltar para pendente',
  preparing: 'Iniciar preparo',
  ready: 'Marcar como pronto',
  delivering: 'Enviar para entrega',
  delivered: 'Confirmar entrega',
  cancelled: 'Cancelar pedido',
}

export const nextStatuses: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivering', 'cancelled'],
  delivering: ['delivered'],
  delivered: [],
  cancelled: [],
}

export type OrderItem = {
  id: string
  product: { id: string; name: string }
  quantity: number
  unitPrice: number
}

export type Order = {
  id: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  latitude: number
  longitude: number
  status: OrderStatus
  totalAmount: number
  deliveryPerson: {
    id: string
    name: string
    phone: string
    vehicleType: string
  } | null
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export type OrderListResponse = {
  data: Order[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export type CreateOrderInput = {
  customerName: string
  customerPhone: string
  deliveryAddress: string
  latitude: number
  longitude: number
  items: Array<{ productId: string; quantity: number }>
}

export type DeliveryPersonOption = {
  id: string
  name: string
  vehicleType: string
  isActive: boolean
  currentOrderId: string | null
}
