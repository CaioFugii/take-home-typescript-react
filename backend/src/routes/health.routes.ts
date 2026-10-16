import { Router } from 'express'
import { asyncHandler } from '../utils/async-handler'

export const healthRouter = Router()

healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'fastmeals-api' })
  }),
)
