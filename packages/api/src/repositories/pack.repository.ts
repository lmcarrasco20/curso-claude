import { Database } from '@config/database.js'
import type { Pack, PackSlot } from '@models/pack.model.js'
import { normalizeDishCategory } from '@models/dish.model.js'

interface PackRow {
    id: string
    restaurantId: string
    name: string
    description: string | null
    price: number
    available: number
    createdAt: string
    updatedAt: string
}

interface SlotRow {
    id: string
    category: string
}

interface ExclusionRow {
    slotId: string
    dishId: string
}

const SELECT_PACK =
    'SELECT id, restaurant_id as restaurantId, name, description, price, available, created_at as createdAt, updated_at as updatedAt FROM packs'

export interface PackRepository {
    findById(id: string): Promise<Pack | null>
    findByRestaurantId(restaurantId: string): Promise<Pack[]>
    /** Crea o actualiza el pack. Al actualizar se sustituyen todos sus huecos. */
    save(pack: Pack): Promise<void>
    delete(id: string): Promise<void>
}

export class SqlitePackRepository implements PackRepository {
    constructor(private readonly db: Database) {}

    async findById(id: string): Promise<Pack | null> {
        const row = await this.db.get<PackRow>(`${SELECT_PACK} WHERE id = ?`, [id])
        return row ? this.mapToPack(row) : null
    }

    async findByRestaurantId(restaurantId: string): Promise<Pack[]> {
        const rows = await this.db.all<PackRow>(`${SELECT_PACK} WHERE restaurant_id = ? ORDER BY name`, [restaurantId])
        const packs: Pack[] = []
        for (const row of rows) {
            packs.push(await this.mapToPack(row))
        }
        return packs
    }

    async save(pack: Pack): Promise<void> {
        const existing = await this.db.get<{ id: string }>('SELECT id FROM packs WHERE id = ?', [pack.id])
        if (existing) {
            await this.db.run(
                'UPDATE packs SET name = ?, description = ?, price = ?, available = ?, updated_at = ? WHERE id = ?',
                [pack.name, pack.description, pack.price, pack.available ? 1 : 0, pack.updatedAt, pack.id]
            )
        } else {
            await this.db.run(
                'INSERT INTO packs (id, restaurant_id, name, description, price, available, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [pack.id, pack.restaurantId, pack.name, pack.description, pack.price, pack.available ? 1 : 0, pack.createdAt, pack.updatedAt]
            )
        }

        // Borrar los huecos elimina también sus exclusiones (ON DELETE CASCADE)
        await this.db.run('DELETE FROM pack_slots WHERE pack_id = ?', [pack.id])
        for (const [position, slot] of pack.slots.entries()) {
            await this.db.run('INSERT INTO pack_slots (id, pack_id, position, category) VALUES (?, ?, ?, ?)', [slot.id, pack.id, position, slot.category])
            for (const dishId of slot.excludedDishIds) {
                await this.db.run('INSERT INTO pack_slot_exclusions (slot_id, dish_id) VALUES (?, ?)', [slot.id, dishId])
            }
        }
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM packs WHERE id = ?', [id])
    }

    private async mapToPack(row: PackRow): Promise<Pack> {
        const slotRows = await this.db.all<SlotRow>('SELECT id, category FROM pack_slots WHERE pack_id = ? ORDER BY position', [row.id])
        const exclusionRows = await this.db.all<ExclusionRow>(
            `SELECT e.slot_id as slotId, e.dish_id as dishId
             FROM pack_slot_exclusions e JOIN pack_slots s ON s.id = e.slot_id
             WHERE s.pack_id = ?`,
            [row.id]
        )
        const slots: PackSlot[] = slotRows.map(slot => ({
            id: slot.id,
            category: normalizeDishCategory(slot.category),
            excludedDishIds: exclusionRows.filter(e => e.slotId === slot.id).map(e => e.dishId)
        }))
        return {
            id: row.id,
            restaurantId: row.restaurantId,
            name: row.name,
            description: row.description,
            price: row.price,
            available: row.available === 1,
            slots,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }
    }
}
