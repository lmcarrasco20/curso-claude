import { Router } from 'express'
import { PointsController } from '@controllers/points.controller.js'
import { PointsService } from '@services/points.service.js'
import { SqlitePointsRepository } from '@repositories/points.repository.js'
import { dbConfig } from '@config/database.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const pointsController = new PointsController(new PointsService(new SqlitePointsRepository(dbConfig)))

/** Regla de puntos de un restaurante: /restaurants/:restaurantId/points-rule */
export const pointsRuleRouter = Router({ mergeParams: true })
pointsRuleRouter.get('/', authenticate, authorize(['admin', 'manager']), pointsController.getRule)
pointsRuleRouter.put('/', authenticate, authorize(['admin']), pointsController.setRule)

/** Puntos del cliente autenticado: /points */
export const pointsRouter = Router()
pointsRouter.get('/mine', authenticate, pointsController.getMyBalance)
