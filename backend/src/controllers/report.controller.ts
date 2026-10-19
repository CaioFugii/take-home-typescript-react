import type { Request, Response } from 'express'
import { parseSchema } from '../middlewares/validate'
import { deliveryTimeQuerySchema, revenueQuerySchema, topProductsQuerySchema } from '../routes/schemas/report.schema'
import { getAverageDeliveryTime, getOrdersByStatus, getRevenue, getTopProducts } from '../services/report.service'

export async function revenueController(req: Request, res: Response): Promise<void> {
  const query = parseSchema(revenueQuerySchema, req.query)
  res.status(200).json(await getRevenue(query))
}

export async function ordersByStatusController(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await getOrdersByStatus())
}

export async function topProductsController(req: Request, res: Response): Promise<void> {
  const query = parseSchema(topProductsQuerySchema, req.query)
  res.status(200).json(await getTopProducts(query))
}

export async function averageDeliveryTimeController(req: Request, res: Response): Promise<void> {
  const query = parseSchema(deliveryTimeQuerySchema, req.query)
  res.status(200).json(await getAverageDeliveryTime(query))
}
