import type { DiscountRepository } from '@repositories/discount.repository.js'
import type { DiscountCode } from '@models/discount.model.js'

export class MockDiscountRepository implements DiscountRepository {
    discounts: DiscountCode[] = []

    async findById(id: string): Promise<DiscountCode | null> {
        return this.discounts.find(d => d.id === id) ?? null
    }

    async findByRestaurantId(restaurantId: string): Promise<DiscountCode[]> {
        return this.discounts.filter(d => d.restaurantId === restaurantId).sort((a, b) => a.code.localeCompare(b.code))
    }

    async findByRestaurantAndCode(restaurantId: string, code: string): Promise<DiscountCode | null> {
        return this.discounts.find(d => d.restaurantId === restaurantId && d.code === code) ?? null
    }

    async save(discount: DiscountCode): Promise<void> {
        const index = this.discounts.findIndex(d => d.id === discount.id)
        if (index >= 0) this.discounts[index] = { ...discount }
        else this.discounts.push({ ...discount })
    }

    async delete(id: string): Promise<void> {
        this.discounts = this.discounts.filter(d => d.id !== id)
    }
}
