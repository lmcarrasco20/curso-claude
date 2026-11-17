import type { PointsRepository } from '@repositories/points.repository.js'
import type { PointsRule, PointsTransaction } from '@models/points.model.js'

export class MockPointsRepository implements PointsRepository {
    rules = new Map<string, PointsRule>()
    transactions: PointsTransaction[] = []

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

    async getBalance(clientId: string, restaurantId: string): Promise<number> {
        return this.transactions
            .filter(t => t.clientId === clientId && t.restaurantId === restaurantId)
            .reduce((sum, t) => sum + t.points, 0)
    }
}
