import { Router } from 'express'
import { loginController, logoutController, meController, refreshController } from '../controllers/auth.controller'
import { authenticate } from '../middlewares/authenticate'
import { validateBody } from '../middlewares/validate'
import { asyncHandler } from '../utils/async-handler'
import { loginSchema, refreshSchema } from './schemas/auth.schema'

export const authRouter = Router()

authRouter.post('/login', validateBody(loginSchema), asyncHandler(loginController))
authRouter.post('/refresh', validateBody(refreshSchema), asyncHandler(refreshController))
authRouter.post('/logout', asyncHandler(logoutController))
authRouter.get('/me', authenticate, asyncHandler(meController))
