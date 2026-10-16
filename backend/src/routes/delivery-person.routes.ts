import { Router } from 'express'
import {
  createDeliveryPersonController,
  deleteDeliveryPersonController,
  listDeliveryPersonsController,
  updateDeliveryPersonController,
} from '../controllers/delivery-person.controller'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { asyncHandler } from '../utils/async-handler'

export const deliveryPersonRouter = Router()

deliveryPersonRouter.use(authenticate)
deliveryPersonRouter.get('/', asyncHandler(listDeliveryPersonsController))
deliveryPersonRouter.post('/', authorize('admin'), asyncHandler(createDeliveryPersonController))
deliveryPersonRouter.put('/:id', authorize('admin'), asyncHandler(updateDeliveryPersonController))
deliveryPersonRouter.delete('/:id', authorize('admin'), asyncHandler(deleteDeliveryPersonController))
