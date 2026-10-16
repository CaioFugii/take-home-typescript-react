import { useEffect, useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { ApiError } from '../services/api'
import { listAvailableDeliveryPersons } from '../services/delivery-persons'
import { assignOrder, updateOrderStatus } from '../services/orders'
import {
  nextStatuses,
  statusClasses,
  statusLabels,
  transitionLabels,
  type DeliveryPersonOption,
  type Order,
  type OrderStatus,
} from '../types/order'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

type OrderDetailProps = {
  order: Order
  isAdmin: boolean
  onClose: () => void
  onChanged: (order: Order) => void
}

export function OrderDetail({ order, isAdmin, onClose, onChanged }: OrderDetailProps) {
  const [couriers, setCouriers] = useState<DeliveryPersonOption[]>([])
  const [courierId, setCourierId] = useState(order.deliveryPerson?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const transitions = nextStatuses[order.status]

  useEffect(() => {
    if (order.status !== 'ready') {
      return
    }
    let cancelled = false
    listAvailableDeliveryPersons()
      .then((response) => {
        if (!cancelled) {
          setCouriers(response.data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Não foi possível carregar os entregadores.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [order.status])

  async function moveTo(status: OrderStatus): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      let current = order
      if (status === 'delivering' && !current.deliveryPerson) {
        if (!courierId) {
          setError('Escolha um entregador para enviar o pedido.')
          return
        }
        current = await assignOrder(order.id, courierId)
      }
      const updated = await updateOrderStatus(current.id, status)
      onChanged(updated)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível atualizar o pedido.')
    } finally {
      setBusy(false)
      setConfirmCancel(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-[#1c1915]/40 px-4 py-8">
      <article className="mx-auto w-full max-w-xl rounded-3xl bg-paper p-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8a7b68]">Pedido</p>
            <h3 className="mt-1 font-display text-4xl">{order.customerName}</h3>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[order.status]}`}>
            {statusLabels[order.status]}
          </span>
        </div>
        <dl className="mt-5 space-y-2 text-sm">
          <div>
            <dt className="text-[#8a7b68]">Telefone</dt>
            <dd>{order.customerPhone}</dd>
          </div>
          <div>
            <dt className="text-[#8a7b68]">Endereço</dt>
            <dd>{order.deliveryAddress}</dd>
          </div>
          <div>
            <dt className="text-[#8a7b68]">Aberto em</dt>
            <dd>{dateTime.format(new Date(order.createdAt))}</dd>
          </div>
          <div>
            <dt className="text-[#8a7b68]">Entregador</dt>
            <dd>{order.deliveryPerson?.name ?? 'Ainda não atribuído'}</dd>
          </div>
        </dl>
        <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-white">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                {item.quantity}x {item.product.name}
              </span>
              <span>{currency.format(item.unitPrice * item.quantity)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between px-4 py-3 text-sm font-semibold">
            <span>Total</span>
            <span>{currency.format(order.totalAmount)}</span>
          </li>
        </ul>

        {isAdmin && order.status === 'ready' && !order.deliveryPerson ? (
          <label className="mt-5 block text-sm font-medium" htmlFor="courier">
            Entregador disponível
            <select
              id="courier"
              value={courierId}
              onChange={(event) => setCourierId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3"
            >
              <option value="">Selecione</option>
              {couriers.map((courier) => (
                <option key={courier.id} value={courier.id}>
                  {courier.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 rounded-2xl bg-[#fde8e1] px-4 py-3 text-sm text-[#9a3412]">
            {error}
          </p>
        ) : null}

        {isAdmin && transitions.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {transitions.map((status) => (
              <button
                key={status}
                type="button"
                disabled={busy}
                onClick={() => {
                  if (status === 'cancelled') {
                    setConfirmCancel(true)
                    return
                  }
                  void moveTo(status)
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60 ${
                  status === 'cancelled' ? 'border border-ember text-ember' : 'bg-ink text-paper'
                }`}
              >
                {transitionLabels[status]}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-full border border-ink px-4 py-2 text-sm">
            Fechar
          </button>
        </div>
      </article>
      {confirmCancel ? (
        <ConfirmDialog
          title="Cancelar pedido"
          description={`Cancelar o pedido de ${order.customerName}? Essa transição não pode ser desfeita.`}
          confirmLabel="Cancelar pedido"
          busy={busy}
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => {
            void moveTo('cancelled')
          }}
        />
      ) : null}
    </div>
  )
}
