import { useEffect, useState } from 'react'
import { OrderDetail } from '../components/OrderDetail'
import { OrderForm } from '../components/OrderForm'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/api'
import { listOrders } from '../services/orders'
import {
  orderStatuses,
  statusClasses,
  statusLabels,
  type Order,
  type OrderListResponse,
  type OrderStatus,
} from '../types/order'

const pageSize = 8
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function summarize(order: Order): string {
  const names = order.items.slice(0, 2).map((item) => `${item.quantity}x ${item.product.name}`)
  const extra = order.items.length - names.length
  return extra > 0 ? `${names.join(', ')} +${extra}` : names.join(', ')
}

export function OrdersPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<OrderListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [selected, setSelected] = useState<Order | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listOrders({
      page,
      limit: pageSize,
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .then((response) => {
        if (!cancelled) {
          setResult(response)
          setError(null)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : 'Não foi possível carregar os pedidos.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [endDate, page, reloadToken, startDate, status])

  const orders = result?.data ?? []
  const pagination = result?.pagination

  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && page > pagination.totalPages) {
      setPage(pagination.totalPages)
    }
  }, [page, pagination])

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#8a7b68]">Fila</p>
          <h2 className="mt-2 font-display text-5xl">Pedidos</h2>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white"
          >
            Novo pedido
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <select
          aria-label="Filtrar por status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as OrderStatus | '')
            setPage(1)
          }}
          className="rounded-2xl border border-line bg-white px-4 py-3"
        >
          <option value="">Todos os status</option>
          {orderStatuses.map((item) => (
            <option key={item} value={item}>
              {statusLabels[item]}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Data inicial"
          value={startDate}
          onChange={(event) => {
            setStartDate(event.target.value)
            setPage(1)
          }}
          className="rounded-2xl border border-line bg-white px-4 py-3"
        />
        <input
          type="date"
          aria-label="Data final"
          value={endDate}
          onChange={(event) => {
            setEndDate(event.target.value)
            setPage(1)
          }}
          className="rounded-2xl border border-line bg-white px-4 py-3"
        />
      </div>

      {loading && !result ? <p className="mt-8 text-sm text-[#6d6256]">Carregando pedidos...</p> : null}
      {error ? (
        <p role="alert" className="mt-8 text-sm text-ember">
          {error}
        </p>
      ) : null}
      {!loading && !error && orders.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-[#c9bba6] bg-white/60 px-6 py-10">
          <p className="font-medium">Nenhum pedido neste filtro.</p>
        </div>
      ) : null}

      {orders.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.14em] text-[#8a7b68]">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Itens</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-4 font-medium">{order.customerName}</td>
                  <td className="px-4 py-4 text-[#5c5146]">{summarize(order)}</td>
                  <td className="px-4 py-4">{currency.format(order.totalAmount)}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4">{dateTime.format(new Date(order.createdAt))}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(order)}
                      className="rounded-full border border-ink px-3 py-1 text-xs font-medium"
                    >
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {pagination && pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-[#6d6256]">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-full border border-ink px-4 py-2 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-full border border-ink px-4 py-2 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <OrderDetail
          order={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onChanged={(order) => {
            setSelected(order)
            setReloadToken((current) => current + 1)
          }}
        />
      ) : null}
      {creating ? (
        <OrderForm
          onCancel={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            setPage(1)
            setReloadToken((current) => current + 1)
          }}
        />
      ) : null}
    </section>
  )
}
