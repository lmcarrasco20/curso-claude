import { randomUUID } from 'crypto'
import type { Pack, PackInput, ValidPackInput } from '@models/pack.model.js'
import { validatePackInput } from '@models/pack.model.js'
import type { PackRepository } from '@repositories/pack.repository.js'
import { PackNotFoundError } from '@errors/DomainErrors.js'

export interface CreatePackDTO extends PackInput {
    restaurantId: string
}

export class PackService {
    constructor(private readonly packRepository: PackRepository) {}

    async create(dto: CreatePackDTO): Promise<Pack> {
        const data = validatePackInput(dto)
        const now = new Date().toISOString()
        const pack: Pack = {
            id: randomUUID(),
            restaurantId: dto.restaurantId,
            ...this.buildContent(data),
            createdAt: now,
            updatedAt: now
        }
        await this.packRepository.save(pack)
        return pack
    }

    async findByRestaurantId(restaurantId: string): Promise<Pack[]> {
        return this.packRepository.findByRestaurantId(restaurantId)
    }

    /** Packs que el cliente puede pedir */
    async findAvailableByRestaurantId(restaurantId: string): Promise<Pack[]> {
        const packs = await this.packRepository.findByRestaurantId(restaurantId)
        return packs.filter(p => p.available)
    }

    async findById(restaurantId: string, id: string): Promise<Pack> {
        const pack = await this.packRepository.findById(id)
        if (!pack || pack.restaurantId !== restaurantId) {
            throw new PackNotFoundError()
        }
        return pack
    }

    async update(restaurantId: string, id: string, dto: PackInput): Promise<Pack> {
        const existing = await this.findById(restaurantId, id)
        const data = validatePackInput(dto)
        const updated: Pack = {
            ...existing,
            ...this.buildContent(data),
            updatedAt: new Date().toISOString()
        }
        await this.packRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        await this.findById(restaurantId, id)
        await this.packRepository.delete(id)
    }

    private buildContent(data: ValidPackInput) {
        return {
            name: data.name,
            description: data.description,
            price: data.price,
            available: data.available,
            slots: data.slots.map(slot => ({ id: randomUUID(), category: slot.category, excludedDishIds: slot.excludedDishIds }))
        }
    }
}
