import type { PackRepository } from '@repositories/pack.repository.js'
import type { Pack } from '@models/pack.model.js'

export class MockPackRepository implements PackRepository {
    packs: Pack[] = []

    async findById(id: string): Promise<Pack | null> {
        return this.packs.find(p => p.id === id) ?? null
    }

    async findByRestaurantId(restaurantId: string): Promise<Pack[]> {
        return this.packs.filter(p => p.restaurantId === restaurantId).sort((a, b) => a.name.localeCompare(b.name))
    }

    async save(pack: Pack): Promise<void> {
        const index = this.packs.findIndex(p => p.id === pack.id)
        if (index >= 0) this.packs[index] = structuredClone(pack)
        else this.packs.push(structuredClone(pack))
    }

    async delete(id: string): Promise<void> {
        this.packs = this.packs.filter(p => p.id !== id)
    }
}
