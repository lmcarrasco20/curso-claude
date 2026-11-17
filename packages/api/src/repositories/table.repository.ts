import { Database } from '@config/database.js'
import type { RestaurantTable } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'

interface TableRow {
    id: string
    restaurantId: string
    number: number
    description: string | null
    capacity: number
    status: string
    createdAt: string
    updatedAt: string
}

const SELECT_TABLE =
    'SELECT id, restaurant_id as restaurantId, number, description, capacity, status, created_at as createdAt, updated_at as updatedAt FROM restaurant_tables'

export interface TableRepository {
    findById(id: string): Promise<RestaurantTable | null>
    findByRestaurantId(restaurantId: string): Promise<RestaurantTable[]>
    findByRestaurantAndNumber(restaurantId: string, number: number): Promise<RestaurantTable | null>
    save(table: RestaurantTable): Promise<void>
    updateStatus(id: string, status: string, updatedAt: string): Promise<void>
    /** Cambia el estado solo si el actual es `expected`. Devuelve false si otro lo había cambiado antes. */
    updateStatusIfCurrent(id: string, expected: string, next: string, updatedAt: string): Promise<boolean>
    delete(id: string): Promise<void>
}

export class SqliteTableRepository implements TableRepository {
    constructor(private readonly db: Database) {}

    async findById(id: string): Promise<RestaurantTable | null> {
        const row = await this.db.get<TableRow>(`${SELECT_TABLE} WHERE id = ?`, [id])
        return row ? this.mapToTable(row) : null
    }

    async findByRestaurantId(restaurantId: string): Promise<RestaurantTable[]> {
        const rows = await this.db.all<TableRow>(`${SELECT_TABLE} WHERE restaurant_id = ? ORDER BY number`, [restaurantId])
        return rows.map(row => this.mapToTable(row))
    }

    async findByRestaurantAndNumber(restaurantId: string, number: number): Promise<RestaurantTable | null> {
        const row = await this.db.get<TableRow>(`${SELECT_TABLE} WHERE restaurant_id = ? AND number = ?`, [restaurantId, number])
        return row ? this.mapToTable(row) : null
    }

    async save(table: RestaurantTable): Promise<void> {
        const existing = await this.findById(table.id)
        if (existing) {
            await this.db.run(
                'UPDATE restaurant_tables SET number = ?, description = ?, capacity = ?, status = ?, updated_at = ? WHERE id = ?',
                [table.number, table.description, table.capacity, table.status, table.updatedAt, table.id]
            )
        } else {
            await this.db.run(
                'INSERT INTO restaurant_tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [table.id, table.restaurantId, table.number, table.description, table.capacity, table.status, table.createdAt, table.updatedAt]
            )
        }
    }

    async updateStatus(id: string, status: string, updatedAt: string): Promise<void> {
        await this.db.run('UPDATE restaurant_tables SET status = ?, updated_at = ? WHERE id = ?', [status, updatedAt, id])
    }

    async updateStatusIfCurrent(id: string, expected: string, next: string, updatedAt: string): Promise<boolean> {
        const result = await this.db.run(
            'UPDATE restaurant_tables SET status = ?, updated_at = ? WHERE id = ? AND status = ?',
            [next, updatedAt, id, expected]
        )
        return result.changes > 0
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM restaurant_tables WHERE id = ?', [id])
    }

    private mapToTable(row: TableRow): RestaurantTable {
        return { ...row, status: normalizeTableStatus(row.status) }
    }
}
