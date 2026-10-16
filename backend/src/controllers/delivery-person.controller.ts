import type { Request, Response } from 'express'
import { parseSchema } from '../middlewares/validate'
import {
  createDeliveryPersonSchema,
  deliveryPersonIdSchema,
  listDeliveryPersonsQuerySchema,
  updateDeliveryPersonSchema,
} from '../routes/delivery-person.schema'
import {
  createDeliveryPerson,
  deleteDeliveryPerson,
  listDeliveryPersons,
  updateDeliveryPerson,
} from '../services/delivery-person.service'

export async function listDeliveryPersonsController(req: Request, res: Response): Promise<void> {
  const query = parseSchema(listDeliveryPersonsQuerySchema, req.query)
  res.status(200).json(await listDeliveryPersons(query))
}

export async function createDeliveryPersonController(req: Request, res: Response): Promise<void> {
  const input = parseSchema(createDeliveryPersonSchema, req.body)
  res.status(201).json(await createDeliveryPerson(input))
}

export async function updateDeliveryPersonController(req: Request, res: Response): Promise<void> {
  const { id } = parseSchema(deliveryPersonIdSchema, req.params)
  const input = parseSchema(updateDeliveryPersonSchema, req.body)
  res.status(200).json(await updateDeliveryPerson(id, input))
}

export async function deleteDeliveryPersonController(req: Request, res: Response): Promise<void> {
  const { id } = parseSchema(deliveryPersonIdSchema, req.params)
  await deleteDeliveryPerson(id)
  res.status(204).send()
}
