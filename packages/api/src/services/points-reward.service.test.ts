import { describe, it, expect, beforeEach } from 'vitest'
import { PointsRewardService } from './points-reward.service.js'
import { MockPointsRewardRepository } from '@repositories/mocks/MockPointsRewardRepository.js'
import { DuplicatedPointsRewardError, InvalidPointsRewardError, PointsRewardNotFoundError } from '@errors/DomainErrors.js'

describe('PointsRewardService', () => {
    let repo: MockPointsRewardRepository
    let service: PointsRewardService

    beforeEach(() => {
        repo = new MockPointsRewardRepository()
        service = new PointsRewardService(repo)
    })

    it('crea una equivalencia', async () => {
        const reward = await service.create({ restaurantId: 'r1', points: 10, discount: 1 })
        expect(reward).toMatchObject({ restaurantId: 'r1', points: 10, discount: 1 })
        expect(reward.id).toBeTruthy()
        expect(await repo.findById(reward.id)).not.toBeNull()
    })

    it('rechaza datos inválidos', async () => {
        await expect(service.create({ restaurantId: 'r1', points: 0, discount: 1 })).rejects.toThrow(InvalidPointsRewardError)
    })

    it('rechaza puntos repetidos en el restaurante pero los permite en otro', async () => {
        await service.create({ restaurantId: 'r1', points: 10, discount: 1 })
        await expect(service.create({ restaurantId: 'r1', points: 10, discount: 2 })).rejects.toThrow(DuplicatedPointsRewardError)
        await expect(service.create({ restaurantId: 'r2', points: 10, discount: 2 })).resolves.toBeDefined()
    })

    it('lista las equivalencias ordenadas por puntos', async () => {
        await service.create({ restaurantId: 'r1', points: 100, discount: 10 })
        await service.create({ restaurantId: 'r1', points: 10, discount: 1 })
        await service.create({ restaurantId: 'r2', points: 5, discount: 1 })
        expect((await service.findByRestaurantId('r1')).map(r => r.points)).toEqual([10, 100])
    })

    it('obtiene una equivalencia y falla si no existe o es de otro restaurante', async () => {
        const reward = await service.create({ restaurantId: 'r1', points: 10, discount: 1 })
        expect((await service.findById('r1', reward.id)).id).toBe(reward.id)
        await expect(service.findById('r1', 'no-existe')).rejects.toThrow(PointsRewardNotFoundError)
        await expect(service.findById('r2', reward.id)).rejects.toThrow(PointsRewardNotFoundError)
    })

    it('actualiza una equivalencia y permite conservar sus propios puntos', async () => {
        const reward = await service.create({ restaurantId: 'r1', points: 10, discount: 1 })
        const updated = await service.update('r1', reward.id, { points: 10, discount: 2 })
        expect(updated).toMatchObject({ id: reward.id, points: 10, discount: 2 })
    })

    it('no permite actualizar a los puntos de otra equivalencia', async () => {
        await service.create({ restaurantId: 'r1', points: 10, discount: 1 })
        const b = await service.create({ restaurantId: 'r1', points: 100, discount: 10 })
        await expect(service.update('r1', b.id, { points: 10, discount: 10 })).rejects.toThrow(DuplicatedPointsRewardError)
    })

    it('elimina una equivalencia y falla si no existe', async () => {
        const reward = await service.create({ restaurantId: 'r1', points: 10, discount: 1 })
        await service.delete('r1', reward.id)
        expect(await repo.findById(reward.id)).toBeNull()
        await expect(service.delete('r1', reward.id)).rejects.toThrow(PointsRewardNotFoundError)
    })
})
