import { randomUUID } from 'crypto'
import type { PointsRepository } from '@repositories/points.repository.js'
import type { Order } from '@models/order.model.js'
import { isOrderFullyDelivered } from '@models/order.model.js'
import type { PointsRule } from '@models/points.model.js'
import { DEFAULT_POINTS_RULE, calculateOrderTotal, calculatePoints, validatePointsRule } from '@models/points.model.js'

export class PointsService {
    constructor(private readonly pointsRepository: PointsRepository) {}

    async getRule(restaurantId: string): Promise<PointsRule> {
        const rule = await this.pointsRepository.findRule(restaurantId)
        return rule ?? { restaurantId, ...DEFAULT_POINTS_RULE }
    }

    async setRule(restaurantId: string, eurosPerBlock: number, pointsPerBlock: number): Promise<PointsRule> {
        const valid = validatePointsRule(eurosPerBlock, pointsPerBlock)
        const rule: PointsRule = { restaurantId, ...valid }
        await this.pointsRepository.saveRule(rule)
        return rule
    }

    /**
     * Da puntos al cliente por un pedido completamente entregado.
     * Devuelve los puntos ganados (0 si no procede o si el pedido ya los había dado).
     */
    async awardForOrder(order: Order): Promise<number> {
        if (!order.clientId || !isOrderFullyDelivered(order)) return 0

        const rule = await this.getRule(order.restaurantId)
        const points = calculatePoints(calculateOrderTotal(order), rule)
        if (points <= 0) return 0

        const added = await this.pointsRepository.addEarned({
            id: randomUUID(),
            clientId: order.clientId,
            restaurantId: order.restaurantId,
            orderId: order.id,
            points,
            createdAt: new Date().toISOString()
        })
        return added ? points : 0
    }

    async getBalance(clientId: string, restaurantId: string): Promise<number> {
        return this.pointsRepository.getBalance(clientId, restaurantId)
    }
}
