import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqlitePackRepository } from './pack.repository.js'
import type { Pack } from '@models/pack.model.js'

const buildPack = (overrides: Partial<Pack> = {}): Pack => ({
    id: 'p1',
    restaurantId: 'r1',
    name: 'Menú del día',
    description: 'Entrante, principal y bebida',
    price: 20,
    available: true,
    slots: [
        { id: 's1', category: 'entrante', excludedDishIds: [] },
        { id: 's2', category: 'principal', excludedDishIds: [] },
        { id: 's3', category: 'bebida', excludedDishIds: ['cerveza'] }
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
})

describe('SqlitePackRepository (Integration)', () => {
    let db: Database
    let repo: SqlitePackRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqlitePackRepository(db)
        const now = new Date().toISOString()
        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, `Restaurante ${id}`, 'Calle 1', `${id}@b.com`, '600000000', 'A', 'B', now, now]
            )
        }
        for (const [id, name] of [['cerveza', 'Cerveza'], ['agua', 'Agua']]) {
            await db.run(
                'INSERT INTO dishes (id, name, description, price, category, available, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, name, null, 2, 'bebida', 1, 'r1', now, now]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('guarda un pack con sus huecos y platos bloqueados y lo recupera igual', async () => {
        await repo.save(buildPack())
        expect(await repo.findById('p1')).toEqual(buildPack())
        expect(await repo.findById('no-existe')).toBeNull()
    })

    it('mantiene el orden de los huecos', async () => {
        const pack = await repo.findById('p1')
        expect(pack?.slots.map(s => s.category)).toEqual(['entrante', 'principal', 'bebida'])
    })

    it('lista los packs de un restaurante', async () => {
        await repo.save(buildPack({ id: 'p2', name: 'Pack 2', slots: [{ id: 's4', category: 'postre', excludedDishIds: [] }] }))
        await repo.save(buildPack({ id: 'x1', restaurantId: 'r2', name: 'Otro', slots: [{ id: 's5', category: 'postre', excludedDishIds: [] }] }))
        const packs = await repo.findByRestaurantId('r1')
        expect(packs.map(p => p.id).sort()).toEqual(['p1', 'p2'])
    })

    it('al actualizar sustituye los huecos y los platos bloqueados', async () => {
        await repo.save(buildPack({
            name: 'Menú nuevo',
            price: 25,
            available: false,
            updatedAt: '2026-02-01T00:00:00.000Z',
            slots: [
                { id: 's6', category: 'principal', excludedDishIds: [] },
                { id: 's7', category: 'bebida', excludedDishIds: ['agua', 'cerveza'] }
            ]
        }))
        const pack = await repo.findById('p1')
        expect(pack).toMatchObject({ name: 'Menú nuevo', price: 25, available: false })
        expect(pack?.slots.map(s => s.id)).toEqual(['s6', 's7'])
        expect(pack?.slots[1]?.excludedDishIds.sort()).toEqual(['agua', 'cerveza'])
        const old = await db.get<{ total: number }>("SELECT COUNT(*) as total FROM pack_slots WHERE id IN ('s1', 's2', 's3')")
        expect(old?.total).toBe(0)
    })

    it('al eliminar un pack se eliminan sus huecos y exclusiones', async () => {
        await repo.delete('p1')
        expect(await repo.findById('p1')).toBeNull()
        const slots = await db.get<{ total: number }>("SELECT COUNT(*) as total FROM pack_slots WHERE pack_id = 'p1'")
        const exclusions = await db.get<{ total: number }>("SELECT COUNT(*) as total FROM pack_slot_exclusions WHERE slot_id IN ('s6', 's7')")
        expect(slots?.total).toBe(0)
        expect(exclusions?.total).toBe(0)
    })
})
