import type { PointsRepository } from '@repositories/points.repository.js'
import type { PointsRedemption, PointsRule, PointsTransaction } from '@models/points.model.js'

export class MockPointsRepository implements PointsRepository {
    rules = new Map<string, PointsRule>()
    transactions: PointsTransaction[] = []
    redemptions: PointsRedemption[] = []

    async findRule(restaurantId: string): Promise<PointsRule | null> {
        return this.rules.get(restaurantId) ?? null
    }

    async saveRule(rule: PointsRule): Promise<void> {
        this.rules.set(rule.restaurantId, rule)
    }

    async addEarned(transaction: PointsTransaction): Promise<boolean> {
        if (this.transactions.some(t => t.orderId === transaction.orderId)) return false
        this.transactions.push(transaction)
        return true
    }

    async addRedeemed(redemption: PointsRedemption): Promise<boolean> {
        if (this.redemptions.some(r => r.orderId === redemption.orderId)) return false
        if ((await this.getBalance(redemption.clientId, redemption.restaurantId)) < redemption.points) return false
        this.redemptions.push(redemption)
        return true
    }

    async getBalance(clientId: string, restaurantId: string): Promise<number> {
        const earned = this.transactions
            .filter(t => t.clientId === clientId && t.restaurantId === restaurantId)
            .reduce((sum, t) => sum + t.points, 0)
        const redeemed = this.redemptions
            .filter(r => r.clientId === clientId && r.restaurantId === restaurantId)
            .reduce((sum, r) => sum + r.points, 0)
        return earned - redeemed
    }
}
