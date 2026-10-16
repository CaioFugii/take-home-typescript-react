import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../services/api'
import { createOrder } from '../services/orders'
import { listProducts } from '../services/products'
import type { CreateOrderInput } from '../types/order'
import type { Product } from '../types/product'
import { applyPhoneMask } from '../utils/phone'

type OrderFormProps = {
  onCancel: () => void
  onCreated: () => void
}

type DraftItem = {
  productId: string
  name: string
  quantity: number
}

const phonePattern = /^\(\d{2}\) \d{5}-\d{4}$/

export function OrderForm({ onCancel, onCreated }: OrderFormProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [latitude, setLatitude] = useState('-23.550520')
  const [longitude, setLongitude] = useState('-46.633308')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [items, setItems] = useState<DraftItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    listProducts({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc', isAvailable: true })
      .then((response) => {
        if (!cancelled) {
          setProducts(response.data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Não foi possível carregar os produtos disponíveis.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  function addItem(): void {
    const product = products.find((item) => item.id === productId)
    const parsedQuantity = Number(quantity)
    if (!product || !Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setError('Escolha um produto e uma quantidade inteira maior que zero.')
      return
    }
    setError(null)
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id)
      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + parsedQuantity } : item,
        )
      }
      return [...current, { productId: product.id, name: product.name, quantity: parsedQuantity }]
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (customerName.trim().length < 3 || customerName.trim().length > 100) {
      setError('O nome deve ter entre 3 e 100 caracteres.')
      return
    }
    if (!phonePattern.test(customerPhone.trim())) {
      setError('Use o telefone no formato (11) 98888-0000.')
      return
    }
    if (deliveryAddress.trim().length < 10) {
      setError('Informe o endereço completo.')
      return
    }
    if (Number.isNaN(lat) || lat < -90 || lat > 90 || Number.isNaN(lng) || lng < -180 || lng > 180) {
      setError('Informe latitude e longitude válidas.')
      return
    }
    if (items.length === 0) {
      setError('Adicione ao menos um item.')
      return
    }

    const input: CreateOrderInput = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      latitude: lat,
      longitude: lng,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    }

    setSaving(true)
    setError(null)
    try {
      await createOrder(input)
      onCreated()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível criar o pedido.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-[#1c1915]/40 px-4 py-8">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="mx-auto w-full max-w-xl rounded-3xl bg-paper p-6 shadow-card"
        noValidate
      >
        <p className="text-xs uppercase tracking-[0.18em] text-[#8a7b68]">Novo</p>
        <h3 className="mt-1 font-display text-4xl">Pedido</h3>
        <label className="mt-4 block text-sm font-medium" htmlFor="order-name">
          Cliente
          <input id="order-name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} className={inputClass} />
        </label>
        <label className="mt-4 block text-sm font-medium" htmlFor="order-phone">
          Telefone
          <input
            id="order-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={15}
            value={customerPhone}
            placeholder="(11) 98888-0000"
            onChange={(event) => setCustomerPhone(applyPhoneMask(customerPhone, event.target.value))}
            className={inputClass}
          />
        </label>
        <label className="mt-4 block text-sm font-medium" htmlFor="order-address">
          Endereço
          <textarea
            id="order-address"
            rows={2}
            value={deliveryAddress}
            onChange={(event) => setDeliveryAddress(event.target.value)}
            className={inputClass}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="mt-4 block text-sm font-medium" htmlFor="order-lat">
            Latitude
            <input id="order-lat" value={latitude} onChange={(event) => setLatitude(event.target.value)} className={inputClass} />
          </label>
          <label className="mt-4 block text-sm font-medium" htmlFor="order-lng">
            Longitude
            <input id="order-lng" value={longitude} onChange={(event) => setLongitude(event.target.value)} className={inputClass} />
          </label>
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-white p-4">
          <p className="text-sm font-medium">Itens</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_90px_auto]">
            <select
              aria-label="Produto"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="rounded-2xl border border-line px-3 py-2"
            >
              <option value="">Selecione</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Quantidade"
              inputMode="numeric"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="rounded-2xl border border-line px-3 py-2"
            />
            <button type="button" onClick={addItem} className="rounded-full border border-ink px-3 py-2 text-sm">
              Adicionar
            </button>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.productId} className="flex items-center justify-between gap-3">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <button
                  type="button"
                  className="text-xs text-ember"
                  onClick={() => setItems((current) => current.filter((entry) => entry.productId !== item.productId))}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
        {error ? (
          <p role="alert" className="mt-4 rounded-2xl bg-[#fde8e1] px-4 py-3 text-sm text-[#9a3412]">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={saving} className="rounded-full border border-ink px-4 py-2 text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Salvando...' : 'Criar pedido'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputClass = 'mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-ember focus:ring-2'
