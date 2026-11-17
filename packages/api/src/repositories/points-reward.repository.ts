import { Database } from '@config/database.js'
import type { PointsReward } from '@models/points-reward.model.js'

interface PointsRewardRow {
    id: string
    restaurantId: string
    points: number
    discount: number
    createdAt: string
    updatedAt: string
}

const SELECT_REWARD =
    'SELECT id, restaurant_id as restaurantId, points, discount, created_at as createdAt, updated_at as updatedAt FROM points_rewards'

export interface PointsRewardRepository {
    findById(id: string): Promise<PointsReward | null>
    findByRestaurantId(restaurantId: string): Promise<PointsReward[]>
    findByRestaurantAndPoints(restaurantId: string, points: number): Promise<PointsReward | null>
    save(reward: PointsReward): Promise<void>
    delete(id: string): Promise<void>
}

export class SqlitePointsRewardRepository implements PointsRewardRepository {
    constructor(private readonly db: Database) {}

    async findById(id: string): Promise<PointsReward | null> {
        const row = await this.db.get<PointsRewardRow>(`${SELECT_REWARD} WHERE id = ?`, [id])
        return row ?? null
    }

    async findByRestaurantId(restaurantId: string): Promise<PointsReward[]> {
        return this.db.all<PointsRewardRow>(`${SELECT_REWARD} WHERE restaurant_id = ? ORDER BY points`, [restaurantId])
    }

    async findByRestaurantAndPoints(restaurantId: string, points: number): Promise<PointsReward | null> {
        const row = await this.db.get<PointsRewardRow>(`${SELECT_REWARD} WHERE restaurant_id = ? AND points = ?`, [restaurantId, points])
        return row ?? null
    }

    async save(reward: PointsReward): Promise<void> {
        const existing = await this.findById(reward.id)
        if (existing) {
            await this.db.run(
                'UPDATE points_rewards SET points = ?, discount = ?, updated_at = ? WHERE id = ?',
                [reward.points, reward.discount, reward.updatedAt, reward.id]
            )
        } else {
            await this.db.run(
                'INSERT INTO points_rewards (id, restaurant_id, points, discount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                [reward.id, reward.restaurantId, reward.points, reward.discount, reward.createdAt, reward.updatedAt]
            )
        }
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM points_rewards WHERE id = ?', [id])
    }
}
