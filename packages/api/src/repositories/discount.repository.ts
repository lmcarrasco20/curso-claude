import { Database } from '@config/database.js'
import type { DiscountCode } from '@models/discount.model.js'

interface DiscountRow {
    id: string
    restaurantId: string
    code: string
    type: string
    value: number
    active: number
    createdAt: string
    updatedAt: string
}

const SELECT_DISCOUNT =
    'SELECT id, restaurant_id as restaurantId, code, type, value, active, created_at as createdAt, updated_at as updatedAt FROM discount_codes'

export interface DiscountRepository {
    findById(id: string): Promise<DiscountCode | null>
    findByRestaurantId(restaurantId: string): Promise<DiscountCode[]>
    findByRestaurantAndCode(restaurantId: string, code: string): Promise<DiscountCode | null>
    save(discount: DiscountCode): Promise<void>
    delete(id: string): Promise<void>
}

export class SqliteDiscountRepository implements DiscountRepository {
    constructor(private readonly db: Database) {}

    async findById(id: string): Promise<DiscountCode | null> {
        const row = await this.db.get<DiscountRow>(`${SELECT_DISCOUNT} WHERE id = ?`, [id])
        return row ? this.mapToDiscount(row) : null
    }

    async findByRestaurantId(restaurantId: string): Promise<DiscountCode[]> {
        const rows = await this.db.all<DiscountRow>(`${SELECT_DISCOUNT} WHERE restaurant_id = ? ORDER BY code`, [restaurantId])
        return rows.map(row => this.mapToDiscount(row))
    }

    async findByRestaurantAndCode(restaurantId: string, code: string): Promise<DiscountCode | null> {
        const row = await this.db.get<DiscountRow>(`${SELECT_DISCOUNT} WHERE restaurant_id = ? AND code = ?`, [restaurantId, code])
        return row ? this.mapToDiscount(row) : null
    }

    async save(discount: DiscountCode): Promise<void> {
        const existing = await this.findById(discount.id)
        if (existing) {
            await this.db.run(
                'UPDATE discount_codes SET code = ?, type = ?, value = ?, active = ?, updated_at = ? WHERE id = ?',
                [discount.code, discount.type, discount.value, discount.active ? 1 : 0, discount.updatedAt, discount.id]
            )
        } else {
            await this.db.run(
                'INSERT INTO discount_codes (id, restaurant_id, code, type, value, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [discount.id, discount.restaurantId, discount.code, discount.type, discount.value, discount.active ? 1 : 0, discount.createdAt, discount.updatedAt]
            )
        }
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM discount_codes WHERE id = ?', [id])
    }

    private mapToDiscount(row: DiscountRow): DiscountCode {
        return { ...row, type: row.type as DiscountCode['type'], active: row.active === 1 }
    }
}
