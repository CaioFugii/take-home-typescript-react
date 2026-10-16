import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ProductForm } from '../components/ProductForm'
import { useAuth } from '../context/AuthContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { ApiError } from '../services/api'
import { createProduct, deleteProduct, listProducts, updateProduct } from '../services/products'
import {
  categoryLabels,
  productCategories,
  type Product,
  type ProductCategory,
  type ProductInput,
  type ProductListResponse,
} from '../types/product'

const pageSize = 8
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

type AvailabilityFilter = 'all' | 'available' | 'unavailable'
type SortOption = 'recent' | 'name' | 'price-asc' | 'price-desc'

const sortQuery: Record<SortOption, { sortBy: 'createdAt' | 'name' | 'price'; sortOrder: 'asc' | 'desc' }> = {
  recent: { sortBy: 'createdAt', sortOrder: 'desc' },
  name: { sortBy: 'name', sortOrder: 'asc' },
  'price-asc': { sortBy: 'price', sortOrder: 'asc' },
  'price-desc': { sortBy: 'price', sortOrder: 'desc' },
}

export function ProductsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [sort, setSort] = useState<SortOption>('recent')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<ProductListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [editing, setEditing] = useState<Product | null | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const sortParams = sortQuery[sort]
    listProducts({
      page,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      category: category || undefined,
      isAvailable: availability === 'all' ? undefined : availability === 'available',
      sortBy: sortParams.sortBy,
      sortOrder: sortParams.sortOrder,
    })
      .then((response) => {
        if (!cancelled) {
          setResult(response)
          setError(null)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : 'Não foi possível carregar o cardápio.')
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
  }, [availability, category, debouncedSearch, page, reloadToken, sort])

  async function saveProduct(input: ProductInput): Promise<void> {
    if (editing) {
      await updateProduct(editing.id, input)
    } else {
      await createProduct(input)
    }
    setEditing(undefined)
    setReloadToken((current) => current + 1)
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) {
      return
    }
    setDeleting(true)
    setActionError(null)
    try {
      await deleteProduct(pendingDelete.id)
      setPendingDelete(null)
      setReloadToken((current) => current + 1)
    } catch (caught) {
      setActionError(
        caught instanceof ApiError ? caught.message : 'Não foi possível excluir o produto.',
      )
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  async function toggleAvailability(product: Product): Promise<void> {
    setPendingToggleId(product.id)
    setActionError(null)
    try {
      await updateProduct(product.id, { isAvailable: !product.isAvailable })
      setReloadToken((current) => current + 1)
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : 'Não foi possível atualizar a disponibilidade.')
    } finally {
      setPendingToggleId(null)
    }
  }

  const products = result?.data ?? []
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
          <p className="text-xs uppercase tracking-[0.2em] text-[#8a7b68]">Cardápio</p>
          <h2 className="mt-2 font-display text-5xl">Produtos</h2>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white"
          >
            Novo produto
          </button>
        ) : (
          <p className="text-sm text-[#6d6256]">Seu perfil pode consultar o cardápio.</p>
        )}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Buscar por nome"
          aria-label="Buscar por nome"
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-ember focus:ring-2"
        />
        <select
          value={category}
          aria-label="Filtrar por categoria"
          onChange={(event) => {
            setCategory(event.target.value as ProductCategory | '')
            setPage(1)
          }}
          className="rounded-2xl border border-line bg-white px-4 py-3"
        >
          <option value="">Todas as categorias</option>
          {productCategories.map((item) => (
            <option key={item} value={item}>
              {categoryLabels[item]}
            </option>
          ))}
        </select>
        <select
          value={availability}
          aria-label="Filtrar por disponibilidade"
          onChange={(event) => {
            setAvailability(event.target.value as AvailabilityFilter)
            setPage(1)
          }}
          className="rounded-2xl border border-line bg-white px-4 py-3"
        >
          <option value="all">Todos</option>
          <option value="available">Disponíveis</option>
          <option value="unavailable">Indisponíveis</option>
        </select>
        <select
          value={sort}
          aria-label="Ordenar produtos"
          onChange={(event) => {
            setSort(event.target.value as SortOption)
            setPage(1)
          }}
          className="rounded-2xl border border-line bg-white px-4 py-3"
        >
          <option value="recent">Mais recentes</option>
          <option value="name">Nome</option>
          <option value="price-asc">Menor preço</option>
          <option value="price-desc">Maior preço</option>
        </select>
      </div>

      {actionError ? (
        <p role="alert" className="mt-4 rounded-2xl bg-[#fde8e1] px-4 py-3 text-sm text-[#9a3412]">
          {actionError}
        </p>
      ) : null}

      {loading && !result ? <p className="mt-8 text-sm text-[#6d6256]">Carregando cardápio...</p> : null}
      {error ? (
        <p role="alert" className="mt-8 text-sm text-ember">
          {error}
        </p>
      ) : null}

      {!loading && !error && products.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-[#c9bba6] bg-white/60 px-6 py-10">
          <p className="font-medium">Nenhum produto encontrado.</p>
          <p className="mt-2 text-sm text-[#6d6256]">Ajuste a busca ou os filtros.</p>
        </div>
      ) : null}

      {products.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.14em] text-[#8a7b68]">
              <tr>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Preparo</th>
                <th className="px-4 py-3 font-medium">Disponível</th>
                {isAdmin ? <th className="px-4 py-3 font-medium">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-4">
                    <p className="font-medium">{product.name}</p>
                    <p className="mt-1 max-w-sm text-xs text-[#6d6256]">{product.description}</p>
                  </td>
                  <td className="px-4 py-4">{categoryLabels[product.category]}</td>
                  <td className="px-4 py-4">{currency.format(product.price)}</td>
                  <td className="px-4 py-4">{product.preparationTime} min</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={product.isAvailable}
                      aria-label={`Disponibilidade de ${product.name}`}
                      disabled={!isAdmin || pendingToggleId === product.id}
                      onClick={() => {
                        void toggleAvailability(product)
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        product.isAvailable ? 'bg-[#e5f2ea] text-[#1b3329]' : 'bg-[#f3e6dc] text-[#9a3412]'
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      {product.isAvailable ? 'Sim' : 'Não'}
                    </button>
                  </td>
                  {isAdmin ? (
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(product)}
                          className="rounded-full border border-ink px-3 py-1 text-xs font-medium"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(product)}
                          className="rounded-full border border-ember px-3 py-1 text-xs font-medium text-ember"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  ) : null}
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

      {editing !== undefined ? (
        <ProductForm product={editing} onCancel={() => setEditing(undefined)} onSubmit={saveProduct} />
      ) : null}
      {pendingDelete ? (
        <ConfirmDialog
          title="Excluir produto"
          description={`Excluir "${pendingDelete.name}" do cardápio? Pedidos já feitos continuam com o preço da época.`}
          confirmLabel="Excluir"
          busy={deleting}
          onCancel={() => {
            if (!deleting) {
              setPendingDelete(null)
            }
          }}
          onConfirm={() => {
            void confirmDelete()
          }}
        />
      ) : null}
    </section>
  )
}
