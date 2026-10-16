import { useState, type FormEvent } from 'react'
import { ApiError } from '../services/api'
import { vehicleLabels, vehicleTypes, type DeliveryPerson, type DeliveryPersonInput, type VehicleType } from '../types/delivery-person'
import { applyPhoneMask } from '../utils/phone'

type DeliveryPersonFormProps = {
  person: DeliveryPerson | null
  onCancel: () => void
  onSubmit: (input: DeliveryPersonInput) => Promise<void>
}

const phonePattern = /^\(\d{2}\) \d{5}-\d{4}$/

export function DeliveryPersonForm({ person, onCancel, onSubmit }: DeliveryPersonFormProps) {
  const [name, setName] = useState(person?.name ?? '')
  const [phone, setPhone] = useState(person?.phone ?? '')
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>(person?.vehicleType ?? '')
  const [latitude, setLatitude] = useState(person?.currentLatitude?.toFixed(6) ?? '')
  const [longitude, setLongitude] = useState(person?.currentLongitude?.toFixed(6) ?? '')
  const [isActive, setIsActive] = useState(person?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName.length < 3 || trimmedName.length > 100) {
      setError('O nome deve ter entre 3 e 100 caracteres.')
      return
    }
    if (!phonePattern.test(phone.trim())) {
      setError('Use o telefone no formato (11) 91234-0000.')
      return
    }
    if (!vehicleType) {
      setError('Escolha o veículo.')
      return
    }
    const latText = latitude.trim()
    const lngText = longitude.trim()
    if ((latText === '') !== (lngText === '')) {
      setError('Informe latitude e longitude juntas, ou deixe as duas vazias.')
      return
    }
    const lat = latText === '' ? null : Number(latText)
    const lng = lngText === '' ? null : Number(lngText)
    if ((lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) || (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180))) {
      setError('Latitude ou longitude fora do intervalo.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        name: trimmedName,
        phone: phone.trim(),
        vehicleType,
        isActive,
        currentLatitude: lat,
        currentLongitude: lng,
      })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar o entregador.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-[#1c1915]/40 px-4 py-8">
      <form onSubmit={(event) => void handleSubmit(event)} className="mx-auto w-full max-w-xl rounded-3xl bg-paper p-6 shadow-card" noValidate>
        <p className="text-xs uppercase tracking-[0.18em] text-[#8a7b68]">{person ? 'Editar' : 'Novo'}</p>
        <h3 className="mt-1 font-display text-4xl">{person ? person.name : 'Entregador'}</h3>
        <label className="mt-4 block text-sm font-medium" htmlFor="courier-name">
          Nome
          <input id="courier-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </label>
        <label className="mt-4 block text-sm font-medium" htmlFor="courier-phone">
          Telefone
          <input
            id="courier-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={15}
            value={phone}
            placeholder="(11) 91234-0000"
            onChange={(event) => setPhone(applyPhoneMask(phone, event.target.value))}
            className={inputClass}
          />
        </label>
        <label className="mt-4 block text-sm font-medium" htmlFor="courier-vehicle">
          Veículo
          <select
            id="courier-vehicle"
            value={vehicleType}
            onChange={(event) => setVehicleType(event.target.value as VehicleType | '')}
            className={inputClass}
          >
            <option value="">Selecione</option>
            {vehicleTypes.map((vehicle) => (
              <option key={vehicle} value={vehicle}>
                {vehicleLabels[vehicle]}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="mt-4 block text-sm font-medium" htmlFor="courier-lat">
            Latitude
            <input id="courier-lat" value={latitude} onChange={(event) => setLatitude(event.target.value)} className={inputClass} />
          </label>
          <label className="mt-4 block text-sm font-medium" htmlFor="courier-lng">
            Longitude
            <input id="courier-lng" value={longitude} onChange={(event) => setLongitude(event.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 accent-[#d4532b]" />
          Ativo para entregas
        </label>
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
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputClass = 'mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-ember focus:ring-2'
