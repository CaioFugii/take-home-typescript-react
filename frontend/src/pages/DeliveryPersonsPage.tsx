import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DeliveryPersonForm } from '../components/DeliveryPersonForm'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/api'
import { createDeliveryPerson, deleteDeliveryPerson, listDeliveryPersons, updateDeliveryPerson } from '../services/delivery-persons'
import { vehicleLabels, type DeliveryPerson, type DeliveryPersonInput } from '../types/delivery-person'

type ActiveFilter = 'all' | 'active' | 'inactive'

export function DeliveryPersonsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [filter, setFilter] = useState<ActiveFilter>('all')
  const [people, setPeople] = useState<DeliveryPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [editing, setEditing] = useState<DeliveryPerson | null | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<DeliveryPerson | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const isActive = filter === 'all' ? undefined : filter === 'active'
    listDeliveryPersons(isActive)
      .then((response) => {
        if (!cancelled) {
          setPeople(response.data)
          setError(null)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : 'Não foi possível carregar os entregadores.')
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
  }, [filter, reloadToken])

  async function savePerson(input: DeliveryPersonInput): Promise<void> {
    if (editing) {
      await updateDeliveryPerson(editing.id, input)
    } else {
      await createDeliveryPerson(input)
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
      await deleteDeliveryPerson(pendingDelete.id)
      setPendingDelete(null)
      setReloadToken((current) => current + 1)
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : 'Não foi possível excluir o entregador.')
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  async function toggleActive(person: DeliveryPerson): Promise<void> {
    setPendingToggleId(person.id)
    setActionError(null)
    try {
      await updateDeliveryPerson(person.id, { isActive: !person.isActive })
      setReloadToken((current) => current + 1)
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : 'Não foi possível atualizar o entregador.')
    } finally {
      setPendingToggleId(null)
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#8a7b68]">Equipe</p>
          <h2 className="mt-2 font-display text-5xl">Entregadores</h2>
        </div>
        {isAdmin ? (
          <button type="button" onClick={() => setEditing(null)} className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white">
            Novo entregador
          </button>
        ) : (
          <p className="text-sm text-[#6d6256]">Seu perfil pode consultar a equipe.</p>
        )}
      </div>

      <div className="mt-6 max-w-xs">
        <select
          aria-label="Filtrar por situação"
          value={filter}
          onChange={(event) => setFilter(event.target.value as ActiveFilter)}
          className="w-full rounded-2xl border border-line bg-white px-4 py-3"
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      {actionError ? (
        <p role="alert" className="mt-4 rounded-2xl bg-[#fde8e1] px-4 py-3 text-sm text-[#9a3412]">
          {actionError}
        </p>
      ) : null}
      {loading ? <p className="mt-8 text-sm text-[#6d6256]">Carregando equipe...</p> : null}
      {error ? (
        <p role="alert" className="mt-8 text-sm text-ember">
          {error}
        </p>
      ) : null}
      {!loading && !error && people.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-[#c9bba6] bg-white/60 px-6 py-10">
          <p className="font-medium">Nenhum entregador neste filtro.</p>
        </div>
      ) : null}

      {people.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.14em] text-[#8a7b68]">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Veículo</th>
                <th className="px-4 py-3 font-medium">Ativo</th>
                <th className="px-4 py-3 font-medium">Em rota</th>
                {isAdmin ? <th className="px-4 py-3 font-medium">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-4 font-medium">{person.name}</td>
                  <td className="px-4 py-4">{person.phone}</td>
                  <td className="px-4 py-4">{vehicleLabels[person.vehicleType]}</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={person.isActive}
                      aria-label={`Situação de ${person.name}`}
                      disabled={!isAdmin || pendingToggleId === person.id}
                      onClick={() => {
                        void toggleActive(person)
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${
                        person.isActive ? 'bg-[#e5f2ea] text-[#1b3329]' : 'bg-[#ece7df] text-[#6d6256]'
                      }`}
                    >
                      {person.isActive ? 'Sim' : 'Não'}
                    </button>
                  </td>
                  <td className="px-4 py-4">{person.currentOrderId ? 'Sim' : 'Não'}</td>
                  {isAdmin ? (
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEditing(person)} className="rounded-full border border-ink px-3 py-1 text-xs font-medium">
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(person)}
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

      {editing !== undefined ? (
        <DeliveryPersonForm person={editing} onCancel={() => setEditing(undefined)} onSubmit={savePerson} />
      ) : null}
      {pendingDelete ? (
        <ConfirmDialog
          title="Excluir entregador"
          description={`Excluir ${pendingDelete.name} da equipe?`}
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
