import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqlitePointsRepository } from './points.repository.js'

describe('SqlitePointsRepository (Integration)', () => {
    let db: Database
    let repo: SqlitePointsRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqlitePointsRepository(db)
        const now = new Date().toISOString()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'La Trattoria', 'Calle 1', 'a@b.com', '600000000', 'A', 'B', now, now]
        )
    })

    afterAll(async () => {
        await db.close()
    })

    it('devuelve null si no hay regla y la actualiza al guardarla de nuevo', async () => {
        expect(await repo.findRule('r1')).toBeNull()
        await repo.saveRule({ restaurantId: 'r1', eurosPerBlock: 10, pointsPerBlock: 1 })
        await repo.saveRule({ restaurantId: 'r1', eurosPerBlock: 5, pointsPerBlock: 3 })
        expect(await repo.findRule('r1')).toEqual({ restaurantId: 'r1', eurosPerBlock: 5, pointsPerBlock: 3 })
    })

    it('suma los puntos ganados y rechaza duplicar el mismo pedido', async () => {
        const tx = { id: 't1', clientId: 'c1', restaurantId: 'r1', orderId: 'o1', points: 4, createdAt: new Date().toISOString() }
        expect(await repo.addEarned(tx)).toBe(true)
        expect(await repo.addEarned({ ...tx, id: 't2' })).toBe(false)
        expect(await repo.addEarned({ ...tx, id: 't3', orderId: 'o2', points: 6 })).toBe(true)
        expect(await repo.getBalance('c1', 'r1')).toBe(10)
        expect(await repo.getBalance('c2', 'r1')).toBe(0)
    })
})
