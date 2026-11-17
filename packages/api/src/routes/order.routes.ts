import { Router } from 'express'
import { OrderController } from '@controllers/order.controller.js'
import { OrderService } from '@services/order.service.js'
import { SqliteOrderRepository } from '@repositories/order.repository.js'
import { PointsService } from '@services/points.service.js'
import { SqlitePointsRepository } from '@repositories/points.repository.js'
import { BillController } from '@controllers/bill.controller.js'
import { BillService } from '@services/bill.service.js'
import { DiscountService } from '@services/discount.service.js'
import { PointsRewardService } from '@services/points-reward.service.js'
import { SqliteBillRepository } from '@repositories/bill.repository.js'
import { SqliteDiscountRepository } from '@repositories/discount.repository.js'
import { SqlitePointsRewardRepository } from '@repositories/points-reward.repository.js'
import { dbConfig } from '@config/database.js'
import { authenticate } from '@shared/infrastructure/http/middlewares.js'

const orderRepository = new SqliteOrderRepository(dbConfig)
const pointsService = new PointsService(new SqlitePointsRepository(dbConfig))
const orderService = new OrderService(orderRepository, pointsService)
const orderController = new OrderController(orderService)
const billController = new BillController(new BillService(
    orderRepository,
    new SqliteBillRepository(dbConfig),
    new DiscountService(new SqliteDiscountRepository(dbConfig)),
    new PointsRewardService(new SqlitePointsRewardRepository(dbConfig)),
    pointsService
))

const router = Router()

router.post('/', authenticate, orderController.createOrder.bind(orderController))
router.get('/active', authenticate, orderController.getActiveOrders.bind(orderController))
router.get('/mine', authenticate, orderController.getMyOrders.bind(orderController))
router.get('/:id', authenticate, orderController.getById.bind(orderController))
router.post('/:id/bill', authenticate, billController.requestBill)
router.get('/:id/bill', authenticate, billController.getBill)
router.patch('/:orderId/items/:itemId/status', authenticate, orderController.updateItemStatus.bind(orderController))

export default router
