import { Router } from 'express'
import { dbConfig } from '@config/database.js'
import { SqlitePointsRewardRepository } from '@repositories/points-reward.repository.js'
import { PointsRewardService } from '@services/points-reward.service.js'
import { PointsRewardController } from '@controllers/points-reward.controller.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const pointsRewardController = new PointsRewardController(new PointsRewardService(new SqlitePointsRewardRepository(dbConfig)))

const router = Router({ mergeParams: true })

// Cualquier usuario autenticado (el cliente) puede consultar las equivalencias; solo el admin las gestiona
router.get('/', authenticate, pointsRewardController.getAll)
router.post('/', authenticate, authorize(['admin']), pointsRewardController.create)
router.put('/:id', authenticate, authorize(['admin']), pointsRewardController.update)
router.delete('/:id', authenticate, authorize(['admin']), pointsRewardController.delete)

export default router
