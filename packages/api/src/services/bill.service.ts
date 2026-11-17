import { randomUUID } from 'crypto'
import type { OrderRepository } from '@repositories/order.repository.js'
import type { BillRepository } from '@repositories/bill.repository.js'
import type { DiscountService } from '@services/discount.service.js'
import type { PointsRewardService } from '@services/points-reward.service.js'
import type { PointsService } from '@services/points.service.js'
import type { Bill } from '@models/bill.model.js'
import { calculateBill } from '@models/bill.model.js'
import { calculateOrderTotal } from '@models/points.model.js'
import type { Order } from '@models/order.model.js'
import { BillAlreadyRequestedError, BillNotFoundError, OrderNotFoundError, OrderNotOwnedError } from '@errors/DomainErrors.js'

export interface RequestBillDTO {
    orderId: string
    clientId: string
    discountCode?: string | null
    pointsRewardId?: string | null
}

export class BillService {
    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly billRepository: BillRepository,
        private readonly discountService: DiscountService,
        private readonly pointsRewardService: PointsRewardService,
        private readonly pointsService: PointsService
    ) {}

    /**
     * Calcula y guarda la cuenta de un pedido aplicando, si se piden, un código de descuento
     * y el canje de puntos. Se puede pedir una sola vez por pedido.
     */
    async requestBill(dto: RequestBillDTO): Promise<Bill> {
        const order = await this.findOwnOrder(dto.orderId, dto.clientId)
        if (await this.billRepository.findByOrderId(order.id)) {
            throw new BillAlreadyRequestedError()
        }

        // Se validan código y equivalencia antes de gastar ningún punto
        const code = dto.discountCode ? await this.discountService.findUsableByCode(order.restaurantId, dto.discountCode) : undefined
        const reward = dto.pointsRewardId ? await this.pointsRewardService.findById(order.restaurantId, dto.pointsRewardId) : undefined

        const calculation = calculateBill({ subtotal: calculateOrderTotal(order), code, reward })

        if (calculation.pointsUsed > 0) {
            const redeemed = await this.pointsService.redeem(dto.clientId, order.restaurantId, order.id, calculation.pointsUsed)
            if (!redeemed) {
                throw new BillAlreadyRequestedError()
            }
        }

        const bill: Bill = {
            id: randomUUID(),
            orderId: order.id,
            clientId: dto.clientId,
            restaurantId: order.restaurantId,
            discountCode: code?.code ?? null,
            ...calculation,
            createdAt: new Date().toISOString()
        }
        if (!(await this.billRepository.save(bill))) {
            throw new BillAlreadyRequestedError()
        }
        return bill
    }

    async getByOrder(orderId: string, clientId: string): Promise<Bill> {
        const order = await this.findOwnOrder(orderId, clientId)
        const bill = await this.billRepository.findByOrderId(order.id)
        if (!bill) {
            throw new BillNotFoundError()
        }
        return bill
    }

    private async findOwnOrder(orderId: string, clientId: string): Promise<Order> {
        const order = await this.orderRepository.findById(orderId)
        if (!order) {
            throw new OrderNotFoundError()
        }
        if (order.clientId !== clientId) {
            throw new OrderNotOwnedError()
        }
        return order
    }
}
