import { Router } from 'express'
import { dbConfig } from '@config/database.js'
import { SqliteDiscountRepository } from '@repositories/discount.repository.js'
import { DiscountService } from '@services/discount.service.js'
import { DiscountController } from '@controllers/discount.controller.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const discountController = new DiscountController(new DiscountService(new SqliteDiscountRepository(dbConfig)))

const router = Router({ mergeParams: true })

router.post('/', authenticate, authorize(['admin', 'manager']), discountController.create)
router.get('/', authenticate, authorize(['admin', 'manager']), discountController.getAll)
router.get('/:id', authenticate, authorize(['admin', 'manager']), discountController.getById)
router.put('/:id', authenticate, authorize(['admin', 'manager']), discountController.update)
router.delete('/:id', authenticate, authorize(['admin', 'manager']), discountController.delete)

export default router
