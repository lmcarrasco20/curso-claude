import type { TableRepository } from '@repositories/table.repository.js'
import type { RestaurantTable } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'

export class MockTableRepository implements TableRepository {
    tables: RestaurantTable[] = []

    async findById(id: string): Promise<RestaurantTable | null> {
        return this.tables.find(t => t.id === id) ?? null
    }

    async findByRestaurantId(restaurantId: string): Promise<RestaurantTable[]> {
        return this.tables.filter(t => t.restaurantId === restaurantId).sort((a, b) => a.number - b.number)
    }

    async findByRestaurantAndNumber(restaurantId: string, number: number): Promise<RestaurantTable | null> {
        return this.tables.find(t => t.restaurantId === restaurantId && t.number === number) ?? null
    }

    async save(table: RestaurantTable): Promise<void> {
        const index = this.tables.findIndex(t => t.id === table.id)
        if (index >= 0) this.tables[index] = { ...table }
        else this.tables.push({ ...table })
    }

    async updateStatus(id: string, status: string, updatedAt: string): Promise<void> {
        const table = this.tables.find(t => t.id === id)
        if (table) {
            table.status = normalizeTableStatus(status)
            table.updatedAt = updatedAt
        }
    }

    async updateStatusIfCurrent(id: string, expected: string, next: string, updatedAt: string): Promise<boolean> {
        const table = this.tables.find(t => t.id === id)
        if (!table || table.status !== expected) return false
        table.status = normalizeTableStatus(next)
        table.updatedAt = updatedAt
        return true
    }

    async delete(id: string): Promise<void> {
        this.tables = this.tables.filter(t => t.id !== id)
    }
}
