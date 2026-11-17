import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { resetDatabase } from './reset-db.js'

describe('resetDatabase', () => {
    let db: Database

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
    })

    afterAll(async () => {
        await db.close()
    })

    it('elimina los datos de todas las tablas, incluidas las que dependen de otras', async () => {
        const now = new Date().toISOString()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'Prueba', 'Calle 1', 'a@b.com', '600000000', 'A', 'B', now, now]
        )
        await db.run(
            'INSERT INTO ingredients (id, name, unit, current_stock, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['i1', 'Tomate', 'kg', 1, 'r1', now, now]
        )
        await db.run('INSERT INTO orders (id, restaurant_id, table_id, client_id, created_at) VALUES (?, ?, ?, ?, ?)', ['o1', 'r1', null, null, now])

        await resetDatabase(db)

        for (const table of ['restaurants', 'ingredients', 'orders']) {
            const row = await db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table}`)
            expect(row?.total, table).toBe(0)
        }
    })

    it('mantiene las tablas y vuelve a activar las claves foráneas', async () => {
        await resetDatabase(db)
        const fk = await db.get<{ foreign_keys: number }>('PRAGMA foreign_keys')
        expect(fk?.foreign_keys).toBe(1)
        await expect(db.run('SELECT 1 FROM restaurants')).resolves.toBeDefined()
    })
})
