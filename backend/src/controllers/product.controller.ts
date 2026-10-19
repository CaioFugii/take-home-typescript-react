import type { Request, Response } from 'express'
import { parseSchema } from '../middlewares/validate'
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdSchema,
  updateProductSchema,
} from '../routes/schemas/product.schema'
import { createProduct, deleteProduct, getProduct, listProducts, updateProduct } from '../services/product.service'

export async function listProductsController(req: Request, res: Response): Promise<void> {
  const query = parseSchema(listProductsQuerySchema, req.query)
  const result = await listProducts(query)
  res.status(200).json(result)
}

export async function getProductController(req: Request, res: Response): Promise<void> {
  const { id } = parseSchema(productIdSchema, req.params)
  const product = await getProduct(id)
  res.status(200).json(product)
}

export async function createProductController(req: Request, res: Response): Promise<void> {
  const input = parseSchema(createProductSchema, req.body)
  const product = await createProduct(input)
  res.status(201).json(product)
}

export async function updateProductController(req: Request, res: Response): Promise<void> {
  const { id } = parseSchema(productIdSchema, req.params)
  const input = parseSchema(updateProductSchema, req.body)
  const product = await updateProduct(id, input)
  res.status(200).json(product)
}

export async function deleteProductController(req: Request, res: Response): Promise<void> {
  const { id } = parseSchema(productIdSchema, req.params)
  await deleteProduct(id)
  res.status(204).send()
}
