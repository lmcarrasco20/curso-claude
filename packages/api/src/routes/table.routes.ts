import { Router } from 'express'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { TableService } from '@services/table.service.js'
import { TableController } from '@controllers/table.controller.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const tableService = new TableService(new SqliteTableRepository(dbConfig))
const tableController = new TableController(tableService)

const router = Router({ mergeParams: true })

router.post('/', authenticate, authorize(['admin']), tableController.create)
router.get('/', authenticate, authorize(['admin', 'manager', 'camarero']), tableController.getAll)
router.get('/:id', authenticate, authorize(['admin', 'manager', 'camarero']), tableController.getById)
router.put('/:id', authenticate, authorize(['admin']), tableController.update)
router.patch('/:id/status', authenticate, authorize(['admin', 'manager', 'camarero']), tableController.changeStatus)
router.post('/:id/occupy', authenticate, tableController.occupy)
router.delete('/:id', authenticate, authorize(['admin']), tableController.delete)

export default router
