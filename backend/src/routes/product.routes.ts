import { Router } from 'express'
import {
  createProductController,
  deleteProductController,
  getProductController,
  listProductsController,
  updateProductController,
} from '../controllers/product.controller'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { asyncHandler } from '../utils/async-handler'

export const productRouter = Router()

productRouter.use(authenticate)
productRouter.get('/', asyncHandler(listProductsController))
productRouter.get('/:id', asyncHandler(getProductController))
productRouter.post('/', authorize('admin'), asyncHandler(createProductController))
productRouter.put('/:id', authorize('admin'), asyncHandler(updateProductController))
productRouter.delete('/:id', authorize('admin'), asyncHandler(deleteProductController))
