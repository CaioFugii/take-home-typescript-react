import type { DeliveryPersonOption } from '../types/order'
import type { DeliveryPerson, DeliveryPersonInput } from '../types/delivery-person'
import { api } from './api'

export function listAvailableDeliveryPersons(): Promise<{ data: DeliveryPersonOption[] }> {
  return api<{ data: DeliveryPersonOption[] }>('/api/delivery-persons?isActive=true&available=true')
}

export function listDeliveryPersons(isActive?: boolean): Promise<{ data: DeliveryPerson[] }> {
  const params = new URLSearchParams()
  if (isActive !== undefined) {
    params.set('isActive', String(isActive))
  }
  const query = params.toString()
  return api<{ data: DeliveryPerson[] }>(`/api/delivery-persons${query ? `?${query}` : ''}`)
}

export function createDeliveryPerson(input: DeliveryPersonInput): Promise<DeliveryPerson> {
  return api<DeliveryPerson>('/api/delivery-persons', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateDeliveryPerson(id: string, input: Partial<DeliveryPersonInput>): Promise<DeliveryPerson> {
  return api<DeliveryPerson>(`/api/delivery-persons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteDeliveryPerson(id: string): Promise<void> {
  return api<void>(`/api/delivery-persons/${id}`, { method: 'DELETE' })
}
