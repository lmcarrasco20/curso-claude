import { randomUUID } from 'crypto'
import type { DiscountCode, DiscountInput } from '@models/discount.model.js'
import { normalizeDiscountCode, validateDiscountInput } from '@models/discount.model.js'
import type { DiscountRepository } from '@repositories/discount.repository.js'
import {
    DiscountCodeNotFoundError,
    DuplicatedDiscountCodeError,
    InvalidDiscountCodeError,
    InvalidDiscountError
} from '@errors/DomainErrors.js'

export interface CreateDiscountDTO extends DiscountInput {
    restaurantId: string
}

export class DiscountService {
    constructor(private readonly discountRepository: DiscountRepository) {}

    async create(dto: CreateDiscountDTO): Promise<DiscountCode> {
        const data = validateDiscountInput(dto)
        await this.assertCodeAvailable(dto.restaurantId, data.code)

        const now = new Date().toISOString()
        const discount: DiscountCode = {
            id: randomUUID(),
            restaurantId: dto.restaurantId,
            ...data,
            createdAt: now,
            updatedAt: now
        }
        await this.discountRepository.save(discount)
        return discount
    }

    async findByRestaurantId(restaurantId: string): Promise<DiscountCode[]> {
        return this.discountRepository.findByRestaurantId(restaurantId)
    }

    async findById(restaurantId: string, id: string): Promise<DiscountCode> {
        const discount = await this.discountRepository.findById(id)
        if (!discount || discount.restaurantId !== restaurantId) {
            throw new DiscountCodeNotFoundError()
        }
        return discount
    }

    async update(restaurantId: string, id: string, dto: DiscountInput): Promise<DiscountCode> {
        const existing = await this.findById(restaurantId, id)
        const data = validateDiscountInput({ ...dto, active: dto.active ?? existing.active })
        if (data.code !== existing.code) {
            await this.assertCodeAvailable(restaurantId, data.code)
        }

        const updated: DiscountCode = { ...existing, ...data, updatedAt: new Date().toISOString() }
        await this.discountRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        await this.findById(restaurantId, id)
        await this.discountRepository.delete(id)
    }

    /** Código que un cliente puede aplicar: existe en el restaurante y está activo */
    async findUsableByCode(restaurantId: string, code: string): Promise<DiscountCode> {
        let normalized: string
        try {
            normalized = normalizeDiscountCode(code)
        } catch (error) {
            if (error instanceof InvalidDiscountError) throw new InvalidDiscountCodeError()
            throw error
        }

        const discount = await this.discountRepository.findByRestaurantAndCode(restaurantId, normalized)
        if (!discount || !discount.active) {
            throw new InvalidDiscountCodeError()
        }
        return discount
    }

    private async assertCodeAvailable(restaurantId: string, code: string): Promise<void> {
        const duplicated = await this.discountRepository.findByRestaurantAndCode(restaurantId, code)
        if (duplicated) {
            throw new DuplicatedDiscountCodeError()
        }
    }
}
