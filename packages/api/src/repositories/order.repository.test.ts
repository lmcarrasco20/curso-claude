import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteOrderRepository } from './order.repository.js'
import type { Order } from '@models/order.model.js'

describe('SqliteOrderRepository (Integration)', () => {
    let db: Database
    let repo: SqliteOrderRepository

    const buildOrder = (overrides: Partial<Order> = {}): Order => ({
        id: 'o1',
        restaurantId: 'r1',
        tableId: null,
        clientId: 'c1',
        createdAt: new Date('2026-01-01T12:00:00.000Z'),
        items: [{ id: 'i1', dishId: 'd1', quantity: 1, notes: null, status: 'pendiente' }],
        ...overrides
    })

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteOrderRepository(db)
        const now = new Date().toISOString()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'La Trattoria', 'Calle 1', 'a@b.com', '600000000', 'A', 'B', now, now]
        )
        await db.run(
            'INSERT INTO dishes (id, name, description, price, category, available, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['d1', 'Pizza', null, 12.5, 'principal', 1, 'r1', now, now]
        )
        await db.run(
            'INSERT INTO restaurant_tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['t1', 'r1', 7, null, 4, 'ocupada', now, now]
        )
    })

    afterAll(async () => {
        await db.close()
    })

    it('devuelve el número de mesa al consultar un pedido por id', async () => {
        await repo.create(buildOrder({ id: 'o-mesa', tableId: 't1' }))
        const order = await repo.findById('o-mesa')
        expect(order?.tableId).toBe('t1')
        expect(order?.tableNumber).toBe(7)
    })

    it('devuelve el número de mesa en los pedidos activos del restaurante', async () => {
        const active = await repo.findActiveByRestaurant('r1')
        expect(active.find(o => o.id === 'o-mesa')?.tableNumber).toBe(7)
    })

    it('devuelve el número de mesa en los pedidos del cliente', async () => {
        const mine = await repo.findByClientId('c1')
        expect(mine.find(o => o.id === 'o-mesa')?.tableNumber).toBe(7)
    })

    it('un pedido sin mesa no tiene número de mesa', async () => {
        await repo.create(buildOrder({
            id: 'o-sin-mesa',
            tableId: null,
            items: [{ id: 'i-sin-mesa', dishId: 'd1', quantity: 1, notes: null, status: 'pendiente' }]
        }))
        const order = await repo.findById('o-sin-mesa')
        expect(order?.tableId).toBeNull()
        expect(order?.tableNumber ?? null).toBeNull()
    })
})
