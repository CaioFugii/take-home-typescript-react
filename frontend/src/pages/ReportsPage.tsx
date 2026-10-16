import { useEffect, useState } from 'react'
import { RevenueChart, StatusChart } from '../components/ReportCharts'
import { ApiError } from '../services/api'
import { getAverageDeliveryTime, getOrdersByStatus, getRevenue, getTopProducts } from '../services/reports'
import { vehicleLabels } from '../types/delivery-person'
import { statusLabels } from '../types/order'
import type { DeliveryTimeReport, RevenueReport, StatusReport, TopProduct } from '../types/report'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const minutes = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

function isoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function defaultRange(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 29)
  return { startDate: isoDate(start), endDate: isoDate(end) }
}

export function ReportsPage() {
  const initial = defaultRange()
  const [startDate, setStartDate] = useState(initial.startDate)
  const [endDate, setEndDate] = useState(initial.endDate)
  const [revenue, setRevenue] = useState<RevenueReport | null>(null)
  const [statuses, setStatuses] = useState<StatusReport | null>(null)
  const [products, setProducts] = useState<TopProduct[]>([])
  const [delivery, setDelivery] = useState<DeliveryTimeReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!startDate || !endDate || startDate > endDate) {
      setError('A data inicial não pode ser posterior à data final.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all([getRevenue(startDate, endDate), getOrdersByStatus(), getTopProducts(startDate, endDate), getAverageDeliveryTime(startDate, endDate)])
      .then(([revenueReport, statusReport, productReport, deliveryReport]) => {
        if (!cancelled) {
          setRevenue(revenueReport)
          setStatuses(statusReport)
          setProducts(productReport.data)
          setDelivery(deliveryReport)
          setError(null)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : 'Não foi possível carregar os relatórios.')
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
  }, [endDate, startDate])

  return (
    <section>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7b68]">Métricas</p>
        <h2 className="mt-2 font-display text-5xl">Relatórios</h2>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          type="date"
          aria-label="Data inicial"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          className="rounded-2xl border border-line bg-white px-4 py-3"
        />
        <input
          type="date"
          aria-label="Data final"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          className="rounded-2xl border border-line bg-white px-4 py-3"
        />
      </div>

      {loading ? <p className="mt-8 text-sm text-[#6d6256]">Calculando o período...</p> : null}
      {error ? (
        <p role="alert" className="mt-8 text-sm text-ember">
          {error}
        </p>
      ) : null}

      {!loading && !error && revenue && statuses && delivery ? (
        <div className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Receita" value={currency.format(revenue.totalRevenue)} hint={`${revenue.totalOrders} pedidos entregues`} />
            <Metric label="Ticket médio" value={currency.format(revenue.averageOrderValue)} hint="Sobre os pedidos entregues" />
            <Metric
              label="Tempo médio"
              value={delivery.averageMinutes === null ? '—' : `${minutes.format(delivery.averageMinutes)} min`}
              hint={delivery.totalDelivered === 0 ? 'Sem entregas no período' : `De ${delivery.fastestMinutes} a ${delivery.slowestMinutes} min`}
            />
            <Metric label="Fila atual" value={String(statuses.total)} hint="Todos os status, sem filtro de data" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-3xl border border-line bg-white p-5">
              <h3 className="font-display text-3xl">Receita por dia</h3>
              {revenue.dailyRevenue.length === 0 ? (
                <p className="mt-4 text-sm text-[#6d6256]">Nenhuma entrega neste período.</p>
              ) : (
                <RevenueChart points={revenue.dailyRevenue} />
              )}
            </article>
            <article className="rounded-3xl border border-line bg-white p-5">
              <h3 className="font-display text-3xl">Pedidos por status</h3>
              <StatusChart bars={statuses.data.map((row) => ({ label: statusLabels[row.status], count: row.count }))} />
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <article className="rounded-3xl border border-line bg-white p-5">
              <h3 className="font-display text-3xl">Mais vendidos</h3>
              {products.length === 0 ? <p className="mt-4 text-sm text-[#6d6256]">Nenhum item vendido neste período.</p> : null}
              {products.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="border-b border-line text-xs uppercase tracking-[0.14em] text-[#8a7b68]">
                      <tr>
                        <th className="py-3 font-medium">Produto</th>
                        <th className="py-3 font-medium">Quantidade</th>
                        <th className="py-3 font-medium">Receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.productId} className="border-b border-line last:border-0">
                          <td className="py-3 font-medium">{product.productName}</td>
                          <td className="py-3">{product.totalQuantity}</td>
                          <td className="py-3">{currency.format(product.totalRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
            <article className="rounded-3xl border border-line bg-white p-5">
              <h3 className="font-display text-3xl">Por veículo</h3>
              {delivery.byVehicleType.length === 0 ? (
                <p className="mt-4 text-sm text-[#6d6256]">Sem entregas com veículo no período.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {delivery.byVehicleType.map((row) => (
                    <li key={row.vehicleType} className="rounded-2xl bg-paper px-4 py-3">
                      <p className="font-medium">{vehicleLabels[row.vehicleType]}</p>
                      <p className="mt-1 text-sm text-[#5c5146]">
                        {minutes.format(row.averageMinutes)} min · {row.count} entregas
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-3xl border border-line bg-white px-5 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[#8a7b68]">{label}</p>
      <p className="mt-2 font-display text-4xl">{value}</p>
      <p className="mt-2 text-sm text-[#6d6256]">{hint}</p>
    </article>
  )
}
