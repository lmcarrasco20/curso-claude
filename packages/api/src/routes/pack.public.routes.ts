import { Router } from 'express'
import { dbConfig } from '@config/database.js'
import { SqlitePackRepository } from '@repositories/pack.repository.js'
import { PackService } from '@services/pack.service.js'
import { PackController } from '@controllers/pack.controller.js'

const packController = new PackController(new PackService(new SqlitePackRepository(dbConfig)))

const router = Router({ mergeParams: true })

// Packs que el cliente puede pedir (solo los disponibles)
router.get('/', packController.getPublic)

export default router
