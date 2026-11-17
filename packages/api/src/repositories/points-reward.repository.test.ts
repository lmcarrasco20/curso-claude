import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqlitePointsRewardRepository } from './points-reward.repository.js'
import type { PointsReward } from '@models/points-reward.model.js'

const buildReward = (overrides: Partial<PointsReward> = {}): PointsReward => ({
    id: 'p1',
    restaurantId: 'r1',
    points: 10,
    discount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
})

describe('SqlitePointsRewardRepository (Integration)', () => {
    let db: Database
    let repo: SqlitePointsRewardRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqlitePointsRewardRepository(db)
        const now = new Date().toISOString()
        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, `Restaurante ${id}`, 'Calle 1', `${id}@b.com`, '600000000', 'A', 'B', now, now]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('guarda una equivalencia y la encuentra por id', async () => {
        await repo.save(buildReward())
        expect(await repo.findById('p1')).toEqual(buildReward())
        expect(await repo.findById('no-existe')).toBeNull()
    })

    it('actualiza una equivalencia existente al guardarla de nuevo', async () => {
        await repo.save(buildReward({ points: 20, discount: 3, updatedAt: '2026-02-01T00:00:00.000Z' }))
        expect(await repo.findById('p1')).toMatchObject({ points: 20, discount: 3, updatedAt: '2026-02-01T00:00:00.000Z' })
    })

    it('lista las equivalencias de un restaurante ordenadas por puntos', async () => {
        await repo.save(buildReward({ id: 'p2', points: 100, discount: 10 }))
        await repo.save(buildReward({ id: 'p3', points: 5, discount: 0.5 }))
        await repo.save(buildReward({ id: 'x1', restaurantId: 'r2', points: 7, discount: 1 }))
        expect((await repo.findByRestaurantId('r1')).map(r => r.points)).toEqual([5, 20, 100])
    })

    it('busca por puntos dentro del restaurante', async () => {
        expect((await repo.findByRestaurantAndPoints('r1', 100))?.id).toBe('p2')
        expect(await repo.findByRestaurantAndPoints('r2', 100)).toBeNull()
    })

    it('no permite repetir los puntos en el mismo restaurante', async () => {
        await expect(repo.save(buildReward({ id: 'p4', points: 100 }))).rejects.toThrow()
    })

    it('elimina una equivalencia', async () => {
        await repo.delete('p3')
        expect(await repo.findById('p3')).toBeNull()
    })
})
