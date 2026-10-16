import { Router } from 'express'
import {
  averageDeliveryTimeController,
  ordersByStatusController,
  revenueController,
  topProductsController,
} from '../controllers/report.controller'
import { authenticate } from '../middlewares/authenticate'
import { asyncHandler } from '../utils/async-handler'

export const reportRouter = Router()

reportRouter.use(authenticate)
reportRouter.get('/revenue', asyncHandler(revenueController))
reportRouter.get('/orders-by-status', asyncHandler(ordersByStatusController))
reportRouter.get('/top-products', asyncHandler(topProductsController))
reportRouter.get('/average-delivery-time', asyncHandler(averageDeliveryTimeController))
