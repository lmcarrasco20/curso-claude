import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteTableRepository } from './table.repository.js'
import type { RestaurantTable } from '@models/table.model.js'

const buildTable = (overrides: Partial<RestaurantTable> = {}): RestaurantTable => ({
    id: 't1',
    restaurantId: 'r1',
    number: 1,
    description: 'Ventana',
    capacity: 4,
    status: 'libre',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
})

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)
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

    it('guarda una mesa y la encuentra por id', async () => {
        await repo.save(buildTable())
        expect(await repo.findById('t1')).toEqual(buildTable())
        expect(await repo.findById('no-existe')).toBeNull()
    })

    it('actualiza una mesa existente al guardarla de nuevo', async () => {
        await repo.save(buildTable({ number: 1, description: 'Terraza', capacity: 6, updatedAt: '2026-02-01T00:00:00.000Z' }))
        const updated = await repo.findById('t1')
        expect(updated).toMatchObject({ description: 'Terraza', capacity: 6, updatedAt: '2026-02-01T00:00:00.000Z' })
    })

    it('lista las mesas de un restaurante ordenadas por número', async () => {
        await repo.save(buildTable({ id: 't3', number: 3 }))
        await repo.save(buildTable({ id: 't2', number: 2 }))
        await repo.save(buildTable({ id: 'x1', restaurantId: 'r2', number: 1 }))
        const tables = await repo.findByRestaurantId('r1')
        expect(tables.map(t => t.number)).toEqual([1, 2, 3])
    })

    it('busca una mesa por número dentro del restaurante', async () => {
        expect((await repo.findByRestaurantAndNumber('r1', 2))?.id).toBe('t2')
        expect((await repo.findByRestaurantAndNumber('r2', 1))?.id).toBe('x1')
        expect(await repo.findByRestaurantAndNumber('r2', 2)).toBeNull()
    })

    it('actualiza solo el estado', async () => {
        await repo.updateStatus('t2', 'ocupada', '2026-03-01T00:00:00.000Z')
        expect(await repo.findById('t2')).toMatchObject({ status: 'ocupada', updatedAt: '2026-03-01T00:00:00.000Z', number: 2 })
    })

    it('cambia el estado solo si el actual es el esperado', async () => {
        await repo.save(buildTable({ id: 't4', number: 4, status: 'libre' }))
        expect(await repo.updateStatusIfCurrent('t4', 'libre', 'ocupada', '2026-04-01T00:00:00.000Z')).toBe(true)
        expect(await repo.updateStatusIfCurrent('t4', 'libre', 'ocupada', '2026-04-02T00:00:00.000Z')).toBe(false)
        expect(await repo.findById('t4')).toMatchObject({ status: 'ocupada', updatedAt: '2026-04-01T00:00:00.000Z' })
    })

    it('elimina una mesa', async () => {
        await repo.delete('t3')
        expect(await repo.findById('t3')).toBeNull()
    })
})
