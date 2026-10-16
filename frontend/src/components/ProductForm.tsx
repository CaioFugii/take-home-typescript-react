import { useState, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '../services/api'
import { categoryLabels, productCategories, type Product, type ProductCategory, type ProductInput } from '../types/product'

type ProductFormProps = {
  product: Product | null
  onCancel: () => void
  onSubmit: (input: ProductInput) => Promise<void>
}

type FormState = {
  name: string
  description: string
  price: string
  category: ProductCategory | ''
  imageUrl: string
  preparationTime: string
  isAvailable: boolean
}

type FieldName = keyof FormState
type FieldErrors = Partial<Record<FieldName, string>>

const fieldLabels: Record<FieldName, string> = {
  name: 'Nome',
  description: 'Descrição',
  price: 'Preço',
  category: 'Categoria',
  imageUrl: 'URL da imagem',
  preparationTime: 'Preparo (min)',
  isAvailable: 'Disponível',
}

function emptyForm(): FormState {
  return {
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    preparationTime: '',
    isAvailable: true,
  }
}

function fromProduct(product: Product): FormState {
  return {
    name: product.name,
    description: product.description,
    price: product.price.toFixed(2),
    category: product.category,
    imageUrl: product.imageUrl ?? '',
    preparationTime: String(product.preparationTime),
    isAvailable: product.isAvailable,
  }
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {}
  const name = form.name.trim()
  const description = form.description.trim()
  if (name.length < 3 || name.length > 120) {
    errors.name = 'O nome deve ter entre 3 e 120 caracteres'
  }
  if (description.length < 10 || description.length > 500) {
    errors.description = 'A descrição deve ter entre 10 e 500 caracteres'
  }

  const price = Number(form.price.replace(',', '.'))
  if (!form.price.trim() || Number.isNaN(price) || price <= 0) {
    errors.price = 'O preço deve ser maior que zero'
  } else if (Math.abs(price * 100 - Math.round(price * 100)) > 1e-6) {
    errors.price = 'Use no máximo 2 casas decimais'
  }

  if (!form.category) {
    errors.category = 'Escolha uma categoria'
  }

  const imageUrl = form.imageUrl.trim()
  if (imageUrl) {
    try {
      const url = new URL(imageUrl)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.imageUrl = 'Informe uma URL http ou https'
      }
    } catch {
      errors.imageUrl = 'Informe uma URL válida'
    }
  }

  const preparationTime = Number(form.preparationTime)
  if (!Number.isInteger(preparationTime) || preparationTime < 1 || preparationTime > 120) {
    errors.preparationTime = 'O preparo deve ficar entre 1 e 120 minutos'
  }

  return errors
}

function toInput(form: FormState): ProductInput {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price: Number(form.price.replace(',', '.')),
    category: form.category as ProductCategory,
    imageUrl: form.imageUrl.trim(),
    isAvailable: form.isAvailable,
    preparationTime: Number(form.preparationTime),
  }
}

export function ProductForm({ product, onCancel, onSubmit }: ProductFormProps) {
  const [form, setForm] = useState<FormState>(() => (product ? fromProduct(product) : emptyForm()))
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverFields, setServerFields] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  const clientErrors = validate(form)
  const visibleErrors: FieldErrors = {}
  for (const field of Object.keys(fieldLabels) as FieldName[]) {
    if (submitted || touched[field]) {
      visibleErrors[field] = serverFields[field] ?? clientErrors[field]
    }
  }

  function update<K extends FieldName>(field: K, value: FormState[K]): void {
    setForm((current) => ({ ...current, [field]: value }))
    setTouched((current) => ({ ...current, [field]: true }))
    setServerFields((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSubmitted(true)
    setServerError(null)
    setServerFields({})
    if (Object.keys(validate(form)).length > 0) {
      return
    }
    setSaving(true)
    try {
      await onSubmit(toInput(form))
    } catch (error) {
      if (error instanceof ApiError) {
        const nextFields: FieldErrors = {}
        for (const detail of error.details) {
          if (detail.field && detail.message && detail.field in fieldLabels) {
            nextFields[detail.field as FieldName] = detail.message
          }
        }
        setServerFields(nextFields)
        setServerError(error.message)
      } else {
        setServerError('Não foi possível salvar o produto.')
      }
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
        <p className="text-xs uppercase tracking-[0.18em] text-[#8a7b68]">{product ? 'Editar' : 'Novo'}</p>
        <h3 className="mt-1 font-display text-4xl">{product ? product.name : 'Produto'}</h3>

        <Field label="Nome" error={visibleErrors.name} htmlFor="product-name">
          <input
            id="product-name"
            value={form.name}
            aria-invalid={Boolean(visibleErrors.name)}
            onChange={(event) => update('name', event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Descrição" error={visibleErrors.description} htmlFor="product-description">
          <textarea
            id="product-description"
            value={form.description}
            rows={3}
            aria-invalid={Boolean(visibleErrors.description)}
            onChange={(event) => update('description', event.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preço" error={visibleErrors.price} htmlFor="product-price">
            <input
              id="product-price"
              inputMode="decimal"
              value={form.price}
              aria-invalid={Boolean(visibleErrors.price)}
              onChange={(event) => update('price', event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Preparo (min)" error={visibleErrors.preparationTime} htmlFor="product-time">
            <input
              id="product-time"
              inputMode="numeric"
              value={form.preparationTime}
              aria-invalid={Boolean(visibleErrors.preparationTime)}
              onChange={(event) => update('preparationTime', event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Categoria" error={visibleErrors.category} htmlFor="product-category">
          <select
            id="product-category"
            value={form.category}
            aria-invalid={Boolean(visibleErrors.category)}
            onChange={(event) => update('category', event.target.value as ProductCategory | '')}
            className={inputClass}
          >
            <option value="">Selecione</option>
            {productCategories.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="URL da imagem" error={visibleErrors.imageUrl} htmlFor="product-image">
          <input
            id="product-image"
            value={form.imageUrl}
            aria-invalid={Boolean(visibleErrors.imageUrl)}
            onChange={(event) => update('imageUrl', event.target.value)}
            className={inputClass}
          />
        </Field>
        <label className="mt-4 flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.isAvailable}
            onChange={(event) => update('isAvailable', event.target.checked)}
            className="h-4 w-4 accent-[#d4532b]"
          />
          Disponível no cardápio
        </label>

        {serverError ? (
          <p role="alert" className="mt-4 rounded-2xl bg-[#fde8e1] px-4 py-3 text-sm text-[#9a3412]">
            {serverError}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full border border-ink px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputClass = 'mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-ember focus:ring-2'

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="mt-4 block text-sm font-medium" htmlFor={htmlFor}>
      {label}
      {children}
      {error ? <span className="mt-1 block text-sm font-normal text-ember">{error}</span> : null}
    </label>
  )
}
