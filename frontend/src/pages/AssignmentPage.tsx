import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/api'
import { listAvailableDeliveryPersons } from '../services/delivery-persons'
import { assignOrder, listOrders, suggestAssignment, updateOrderStatus } from '../services/orders'
import type { AssignmentPlan, SuggestedAssignment } from '../types/assignment'
import { vehicleLabels, type VehicleType } from '../types/delivery-person'
import type { DeliveryPersonOption, Order } from '../types/order'

const distance = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function withoutAssignment(plan: AssignmentPlan, orderId: string): AssignmentPlan {
  const assignments = plan.assignments.filter((item) => item.orderId !== orderId)
  const totalDistanceKm = Math.round(assignments.reduce((sum, item) => sum + item.estimatedDistanceKm, 0) * 100) / 100
  return { ...plan, assignments, totalDistanceKm }
}

export function AssignmentPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [orders, setOrders] = useState<Order[]>([])
  const [couriers, setCouriers] = useState<DeliveryPersonOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [plan, setPlan] = useState<AssignmentPlan | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([listOrders({ page: 1, limit: 100, status: 'ready' }), listAvailableDeliveryPersons()])
      .then(([orderResponse, courierResponse]) => {
        if (!cancelled) {
          setOrders(orderResponse.data)
          setCouriers(courierResponse.data)
          setError(null)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : 'Não foi possível carregar a fila de rotas.')
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
  }, [reloadToken])

  async function suggest(): Promise<void> {
    setSuggesting(true)
    setActionError(null)
    try {
      setPlan(await suggestAssignment())
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : 'Não foi possível calcular a atribuição.')
    } finally {
      setSuggesting(false)
    }
  }

  async function accept(item: SuggestedAssignment): Promise<void> {
    setBusyOrderId(item.orderId)
    setActionError(null)
    try {
      await assignOrder(item.orderId, item.deliveryPersonId)
      await updateOrderStatus(item.orderId, 'delivering')
      setPlan((current) => (current ? withoutAssignment(current, item.orderId) : current))
      setReloadToken((current) => current + 1)
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : 'Não foi possível aceitar esta rota.')
    } finally {
      setBusyOrderId(null)
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#8a7b68]">Rotas</p>
          <h2 className="mt-2 font-display text-5xl">Atribuição</h2>
        </div>
        {isAdmin ? (
          <button
            type="button"
            disabled={suggesting || loading}
            onClick={() => {
              void suggest()
            }}
            className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {suggesting ? 'Calculando...' : 'Sugerir Atribuição Otimizada'}
          </button>
        ) : (
          <p className="text-sm text-[#6d6256]">Seu perfil consulta a fila. Só o admin dispara a sugestão.</p>
        )}
      </div>

      {actionError ? (
        <p role="alert" className="mt-4 rounded-2xl bg-[#fde8e1] px-4 py-3 text-sm text-[#9a3412]">
          {actionError}
        </p>
      ) : null}
      {loading ? <p className="mt-8 text-sm text-[#6d6256]">Carregando pedidos prontos...</p> : null}
      {error ? (
        <p role="alert" className="mt-8 text-sm text-ember">
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-line bg-white p-5">
            <h3 className="font-display text-3xl">Prontos para sair</h3>
            {orders.length === 0 ? <p className="mt-4 text-sm text-[#6d6256]">Nenhum pedido pronto.</p> : null}
            <ul className="mt-4 space-y-3">
              {orders.map((order) => (
                <li key={order.id} className="rounded-2xl bg-paper px-4 py-3">
                  <p className="font-medium">{order.customerName}</p>
                  <p className="mt-1 text-sm text-[#5c5146]">{order.deliveryAddress}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-line bg-white p-5">
            <h3 className="font-display text-3xl">Entregadores livres</h3>
            {couriers.length === 0 ? <p className="mt-4 text-sm text-[#6d6256]">Ninguém disponível agora.</p> : null}
            <ul className="mt-4 space-y-3">
              {couriers.map((courier) => (
                <li key={courier.id} className="rounded-2xl bg-paper px-4 py-3">
                  <p className="font-medium">{courier.name}</p>
                  <p className="mt-1 text-sm text-[#5c5146]">{vehicleLabels[courier.vehicleType as VehicleType] ?? courier.vehicleType}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {plan ? (
        <div className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="font-display text-3xl">Sugestão</h3>
            <p className="text-sm text-[#6d6256]">
              {distance.format(plan.totalDistanceKm)} km no total · {plan.executionTimeMs} ms
            </p>
          </div>
          {plan.assignments.length === 0 ? (
            <p className="mt-4 text-sm text-[#6d6256]">Nenhuma rota sugerida.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {plan.assignments.map((item) => (
                <li key={item.orderId} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-white px-5 py-4">
                  <div>
                    <p className="font-medium">
                      {item.deliveryPersonName}
                      <span className="text-[#8a7b68]"> → </span>
                      {item.orderAddress}
                    </p>
                    <p className="mt-1 text-sm text-[#5c5146]">{distance.format(item.estimatedDistanceKm)} km</p>
                  </div>
                  {isAdmin ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyOrderId === item.orderId}
                        onClick={() => {
                          void accept(item)
                        }}
                        className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {busyOrderId === item.orderId ? 'Enviando...' : 'Aceitar'}
                      </button>
                      <button
                        type="button"
                        disabled={busyOrderId === item.orderId}
                        onClick={() => setPlan((current) => (current ? withoutAssignment(current, item.orderId) : current))}
                        className="rounded-full border border-ink px-4 py-2 text-sm font-medium disabled:opacity-60"
                      >
                        Rejeitar
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {plan.unassigned.length > 0 ? (
            <div className="mt-6">
              <h3 className="font-display text-2xl">Sem entregador</h3>
              <ul className="mt-3 space-y-2">
                {plan.unassigned.map((item) => (
                  <li key={item.orderId} className="rounded-2xl bg-[#f8e7c8] px-4 py-3 text-sm text-[#8a5a12]">
                    {item.orderAddress}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
