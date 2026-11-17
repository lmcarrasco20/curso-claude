import { Router } from 'express'
import { dbConfig } from '@config/database.js'
import { SqlitePackRepository } from '@repositories/pack.repository.js'
import { PackService } from '@services/pack.service.js'
import { PackController } from '@controllers/pack.controller.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const packController = new PackController(new PackService(new SqlitePackRepository(dbConfig)))

const router = Router({ mergeParams: true })

router.post('/', authenticate, authorize(['admin', 'manager']), packController.create)
router.get('/', authenticate, authorize(['admin', 'manager']), packController.getAll)
router.get('/:id', authenticate, authorize(['admin', 'manager']), packController.getById)
router.put('/:id', authenticate, authorize(['admin', 'manager']), packController.update)
router.delete('/:id', authenticate, authorize(['admin', 'manager']), packController.delete)

export default router
