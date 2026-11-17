import { Database } from '@config/database.js'
import type { PointsRule, PointsTransaction } from '@models/points.model.js'

interface PointsRuleRow {
    restaurantId: string
    eurosPerBlock: number
    pointsPerBlock: number
}

export interface PointsRepository {
    findRule(restaurantId: string): Promise<PointsRule | null>
    saveRule(rule: PointsRule): Promise<void>
    /** Registra los puntos ganados por un pedido. Devuelve false si ese pedido ya los había dado. */
    addEarned(transaction: PointsTransaction): Promise<boolean>
    getBalance(clientId: string, restaurantId: string): Promise<number>
}

export class SqlitePointsRepository implements PointsRepository {
    constructor(private readonly db: Database) {}

    async findRule(restaurantId: string): Promise<PointsRule | null> {
        const row = await this.db.get<PointsRuleRow>(
            'SELECT restaurant_id as restaurantId, euros_per_block as eurosPerBlock, points_per_block as pointsPerBlock FROM points_rules WHERE restaurant_id = ?',
            [restaurantId]
        )
        return row ?? null
    }

    async saveRule(rule: PointsRule): Promise<void> {
        await this.db.run(
            `INSERT INTO points_rules (restaurant_id, euros_per_block, points_per_block) VALUES (?, ?, ?)
             ON CONFLICT(restaurant_id) DO UPDATE SET euros_per_block = excluded.euros_per_block, points_per_block = excluded.points_per_block`,
            [rule.restaurantId, rule.eurosPerBlock, rule.pointsPerBlock]
        )
    }

    async addEarned(transaction: PointsTransaction): Promise<boolean> {
        const result = await this.db.run(
            `INSERT OR IGNORE INTO points_transactions (id, client_id, restaurant_id, order_id, points, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [transaction.id, transaction.clientId, transaction.restaurantId, transaction.orderId, transaction.points, transaction.createdAt]
        )
        return result.changes > 0
    }

    async getBalance(clientId: string, restaurantId: string): Promise<number> {
        const row = await this.db.get<{ total: number | null }>(
            'SELECT SUM(points) as total FROM points_transactions WHERE client_id = ? AND restaurant_id = ?',
            [clientId, restaurantId]
        )
        return row?.total ?? 0
    }
}
