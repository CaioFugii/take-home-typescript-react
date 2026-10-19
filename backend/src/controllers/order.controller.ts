import type { Request, Response } from 'express'
import { parseSchema } from '../middlewares/validate'
import {
  assignOrderSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  orderIdSchema,
  updateStatusSchema,
} from '../routes/schemas/order.schema'
import { suggestOptimizedAssignment } from '../services/assignment.service'
import { assignDeliveryPerson, changeOrderStatus, createOrder, getOrder, listOrders } from '../services/order.service'

export async function listOrdersController(req: Request, res: Response): Promise<void> {
  const query = parseSchema(listOrdersQuerySchema, req.query)
  res.status(200).json(await listOrders(query))
}

export async function getOrderController(req: Request, res: Response): Promise<void> {
  const { id } = parseSchema(orderIdSchema, req.params)
  res.status(200).json(await getOrder(id))
}

export async function createOrderController(req: Request, res: Response): Promise<void> {
  const input = parseSchema(createOrderSchema, req.body)
  res.status(201).json(await createOrder(input))
}

export async function updateOrderStatusController(req: Request, res: Response): Promise<void> {
  const { id } = parseSchema(orderIdSchema, req.params)
  const body = parseSchema(updateStatusSchema, req.body)
  res.status(200).json(await changeOrderStatus(id, body.status))
}

export async function optimizeAssignmentController(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await suggestOptimizedAssignment())
}

export async function assignOrderController(req: Request, res: Response): Promise<void> {
  const { id } = parseSchema(orderIdSchema, req.params)
  const body = parseSchema(assignOrderSchema, req.body)
  res.status(200).json(await assignDeliveryPerson(id, body.deliveryPersonId))
}
