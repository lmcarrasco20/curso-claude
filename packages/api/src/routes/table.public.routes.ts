import { Router } from 'express'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { TableService } from '@services/table.service.js'
import { TableController } from '@controllers/table.controller.js'

const tableController = new TableController(new TableService(new SqliteTableRepository(dbConfig)))

const router = Router({ mergeParams: true })

// Mesas libres con capacidad suficiente: GET /?people=4
router.get('/', tableController.getAvailable)

export default router
