import { randomUUID } from 'crypto'
import type { PointsReward, PointsRewardInput } from '@models/points-reward.model.js'
import { validatePointsRewardInput } from '@models/points-reward.model.js'
import type { PointsRewardRepository } from '@repositories/points-reward.repository.js'
import { DuplicatedPointsRewardError, PointsRewardNotFoundError } from '@errors/DomainErrors.js'

export interface CreatePointsRewardDTO extends PointsRewardInput {
    restaurantId: string
}

export class PointsRewardService {
    constructor(private readonly pointsRewardRepository: PointsRewardRepository) {}

    async create(dto: CreatePointsRewardDTO): Promise<PointsReward> {
        const data = validatePointsRewardInput(dto)
        await this.assertPointsAvailable(dto.restaurantId, data.points)

        const now = new Date().toISOString()
        const reward: PointsReward = { id: randomUUID(), restaurantId: dto.restaurantId, ...data, createdAt: now, updatedAt: now }
        await this.pointsRewardRepository.save(reward)
        return reward
    }

    async findByRestaurantId(restaurantId: string): Promise<PointsReward[]> {
        return this.pointsRewardRepository.findByRestaurantId(restaurantId)
    }

    async findById(restaurantId: string, id: string): Promise<PointsReward> {
        const reward = await this.pointsRewardRepository.findById(id)
        if (!reward || reward.restaurantId !== restaurantId) {
            throw new PointsRewardNotFoundError()
        }
        return reward
    }

    async update(restaurantId: string, id: string, dto: PointsRewardInput): Promise<PointsReward> {
        const existing = await this.findById(restaurantId, id)
        const data = validatePointsRewardInput(dto)
        if (data.points !== existing.points) {
            await this.assertPointsAvailable(restaurantId, data.points)
        }

        const updated: PointsReward = { ...existing, ...data, updatedAt: new Date().toISOString() }
        await this.pointsRewardRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        await this.findById(restaurantId, id)
        await this.pointsRewardRepository.delete(id)
    }

    private async assertPointsAvailable(restaurantId: string, points: number): Promise<void> {
        const duplicated = await this.pointsRewardRepository.findByRestaurantAndPoints(restaurantId, points)
        if (duplicated) {
            throw new DuplicatedPointsRewardError()
        }
    }
}
