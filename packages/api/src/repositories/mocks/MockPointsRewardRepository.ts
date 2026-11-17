import type { PointsRewardRepository } from '@repositories/points-reward.repository.js'
import type { PointsReward } from '@models/points-reward.model.js'

export class MockPointsRewardRepository implements PointsRewardRepository {
    rewards: PointsReward[] = []

    async findById(id: string): Promise<PointsReward | null> {
        return this.rewards.find(r => r.id === id) ?? null
    }

    async findByRestaurantId(restaurantId: string): Promise<PointsReward[]> {
        return this.rewards.filter(r => r.restaurantId === restaurantId).sort((a, b) => a.points - b.points)
    }

    async findByRestaurantAndPoints(restaurantId: string, points: number): Promise<PointsReward | null> {
        return this.rewards.find(r => r.restaurantId === restaurantId && r.points === points) ?? null
    }

    async save(reward: PointsReward): Promise<void> {
        const index = this.rewards.findIndex(r => r.id === reward.id)
        if (index >= 0) this.rewards[index] = { ...reward }
        else this.rewards.push({ ...reward })
    }

    async delete(id: string): Promise<void> {
        this.rewards = this.rewards.filter(r => r.id !== id)
    }
}
