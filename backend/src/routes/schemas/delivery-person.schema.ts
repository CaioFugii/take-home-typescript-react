import { z } from 'zod'

const vehicles = ['bicycle', 'motorcycle', 'car'] as const
const phonePattern = /^\(\d{2}\) \d{5}-\d{4}$/

function blankToUndefined(value: unknown): unknown {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed === '' ? undefined : trimmed
  }
  return raw === undefined ? undefined : raw
}

const optionalBoolean = z.preprocess(
  blankToUndefined,
  z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
)

const latitudeSchema = z.number().min(-90, 'Latitude invalida').max(90, 'Latitude invalida').nullable()
const longitudeSchema = z.number().min(-180, 'Longitude invalida').max(180, 'Longitude invalida').nullable()

export const listDeliveryPersonsQuerySchema = z.object({
  isActive: optionalBoolean,
  available: optionalBoolean,
})

export const deliveryPersonIdSchema = z.object({
  id: z.string().uuid('ID invalido'),
})

const deliveryPersonFields = {
  name: z
    .string()
    .trim()
    .min(3, 'O nome deve ter entre 3 e 100 caracteres')
    .max(100, 'O nome deve ter entre 3 e 100 caracteres'),
  phone: z.string().trim().regex(phonePattern, 'O telefone deve estar no formato (XX) XXXXX-XXXX'),
  vehicleType: z.enum(vehicles, { errorMap: () => ({ message: 'Veiculo invalido' }) }),
  isActive: z.boolean().optional(),
  currentLatitude: latitudeSchema.optional(),
  currentLongitude: longitudeSchema.optional(),
}

export const createDeliveryPersonSchema = z.object(deliveryPersonFields).refine(coordinatesTogether, {
  message: 'Informe latitude e longitude juntas',
  path: ['currentLatitude'],
})

export const updateDeliveryPersonSchema = z
  .object(deliveryPersonFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  })
  .refine(coordinatesTogether, {
    message: 'Informe latitude e longitude juntas',
    path: ['currentLatitude'],
  })

function coordinatesTogether(value: { currentLatitude?: number | null; currentLongitude?: number | null }): boolean {
  if (value.currentLatitude === undefined && value.currentLongitude === undefined) {
    return true
  }
  const latitudeEmpty = value.currentLatitude === undefined || value.currentLatitude === null
  const longitudeEmpty = value.currentLongitude === undefined || value.currentLongitude === null
  return latitudeEmpty === longitudeEmpty
}

export type CreateDeliveryPersonInput = z.infer<typeof createDeliveryPersonSchema>
export type UpdateDeliveryPersonInput = z.infer<typeof updateDeliveryPersonSchema>
export type ListDeliveryPersonsQuery = z.infer<typeof listDeliveryPersonsQuerySchema>
