import { randomUUID } from 'crypto'
import type { PointsRepository } from '@repositories/points.repository.js'
import type { Order } from '@models/order.model.js'
import { isOrderFullyDelivered } from '@models/order.model.js'
import type { PointsRule } from '@models/points.model.js'
import { InsufficientPointsError, InvalidPointsRewardError } from '@errors/DomainErrors.js'
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

    /**
     * Canjea puntos del cliente por un pedido. Devuelve false si ese pedido ya había canjeado puntos.
     * Lanza `InsufficientPointsError` si el saldo no alcanza.
     */
    async redeem(clientId: string, restaurantId: string, orderId: string, points: number): Promise<boolean> {
        if (!Number.isInteger(points) || points <= 0) {
            throw new InvalidPointsRewardError('Los puntos a canjear deben ser un número entero mayor que 0')
        }
        if ((await this.getBalance(clientId, restaurantId)) < points) {
            throw new InsufficientPointsError()
        }

        const added = await this.pointsRepository.addRedeemed({
            id: randomUUID(),
            clientId,
            restaurantId,
            orderId,
            points,
            createdAt: new Date().toISOString()
        })
        if (!added && (await this.getBalance(clientId, restaurantId)) < points) {
            // Otro canje se llevó el saldo entre la comprobación y el registro
            throw new InsufficientPointsError()
        }
        return added
    }

    async getBalance(clientId: string, restaurantId: string): Promise<number> {
        return this.pointsRepository.getBalance(clientId, restaurantId)
    }
}
