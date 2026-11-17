import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteBillRepository } from './bill.repository.js'
import type { Bill } from '@models/bill.model.js'

const buildBill = (overrides: Partial<Bill> = {}): Bill => ({
    id: 'b1',
    orderId: 'o1',
    clientId: 'c1',
    restaurantId: 'r1',
    discountCode: 'VERANO10',
    subtotal: 50,
    codeDiscount: 5,
    pointsUsed: 100,
    pointsDiscount: 10,
    total: 35,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
})

describe('SqliteBillRepository (Integration)', () => {
    let db: Database
    let repo: SqliteBillRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteBillRepository(db)
        const now = new Date().toISOString()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'La Trattoria', 'Calle 1', 'a@b.com', '600000000', 'A', 'B', now, now]
        )
    })

    afterAll(async () => {
        await db.close()
    })

    it('guarda una cuenta y la encuentra por pedido', async () => {
        expect(await repo.findByOrderId('o1')).toBeNull()
        expect(await repo.save(buildBill())).toBe(true)
        expect(await repo.findByOrderId('o1')).toEqual(buildBill())
    })

    it('guarda una cuenta sin código de descuento', async () => {
        expect(await repo.save(buildBill({ id: 'b2', orderId: 'o2', discountCode: null }))).toBe(true)
        expect((await repo.findByOrderId('o2'))?.discountCode).toBeNull()
    })

    it('no guarda dos cuentas para el mismo pedido', async () => {
        expect(await repo.save(buildBill({ id: 'b3', total: 1 }))).toBe(false)
        expect((await repo.findByOrderId('o1'))?.total).toBe(35)
    })
})
