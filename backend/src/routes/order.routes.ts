import { Router } from 'express'
import {
  assignOrderController,
  createOrderController,
  getOrderController,
  listOrdersController,
  optimizeAssignmentController,
  updateOrderStatusController,
} from '../controllers/order.controller'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { asyncHandler } from '../utils/async-handler'

export const orderRouter = Router()

orderRouter.use(authenticate)
orderRouter.get('/', asyncHandler(listOrdersController))
orderRouter.post('/', authorize('admin'), asyncHandler(createOrderController))
orderRouter.post('/optimize-assignment', authorize('admin'), asyncHandler(optimizeAssignmentController))
orderRouter.get('/:id', asyncHandler(getOrderController))
orderRouter.patch('/:id/status', authorize('admin'), asyncHandler(updateOrderStatusController))
orderRouter.patch('/:id/assign', authorize('admin'), asyncHandler(assignOrderController))
