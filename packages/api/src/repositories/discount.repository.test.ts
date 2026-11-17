import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteDiscountRepository } from './discount.repository.js'
import type { DiscountCode } from '@models/discount.model.js'

const buildCode = (overrides: Partial<DiscountCode> = {}): DiscountCode => ({
    id: 'd1',
    restaurantId: 'r1',
    code: 'VERANO10',
    type: 'porcentaje',
    value: 10,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
})

describe('SqliteDiscountRepository (Integration)', () => {
    let db: Database
    let repo: SqliteDiscountRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteDiscountRepository(db)
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

    it('guarda un código y lo encuentra por id', async () => {
        await repo.save(buildCode())
        expect(await repo.findById('d1')).toEqual(buildCode())
        expect(await repo.findById('no-existe')).toBeNull()
    })

    it('actualiza un código existente al guardarlo de nuevo', async () => {
        await repo.save(buildCode({ code: 'VERANO20', type: 'importe', value: 5, active: false, updatedAt: '2026-02-01T00:00:00.000Z' }))
        expect(await repo.findById('d1')).toMatchObject({ code: 'VERANO20', type: 'importe', value: 5, active: false })
    })

    it('busca por código dentro del restaurante', async () => {
        await repo.save(buildCode({ id: 'd2', restaurantId: 'r2', code: 'VERANO20' }))
        expect((await repo.findByRestaurantAndCode('r1', 'VERANO20'))?.id).toBe('d1')
        expect((await repo.findByRestaurantAndCode('r2', 'VERANO20'))?.id).toBe('d2')
        expect(await repo.findByRestaurantAndCode('r1', 'OTRO')).toBeNull()
    })

    it('lista los códigos de un restaurante ordenados por código', async () => {
        await repo.save(buildCode({ id: 'd3', code: 'ABC' }))
        const codes = await repo.findByRestaurantId('r1')
        expect(codes.map(c => c.code)).toEqual(['ABC', 'VERANO20'])
    })

    it('no permite repetir el código en el mismo restaurante', async () => {
        await expect(repo.save(buildCode({ id: 'd4', code: 'ABC' }))).rejects.toThrow()
    })

    it('elimina un código', async () => {
        await repo.delete('d3')
        expect(await repo.findById('d3')).toBeNull()
    })
})
