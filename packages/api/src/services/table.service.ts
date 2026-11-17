import { randomUUID } from 'crypto'
import type { RestaurantTable } from '@models/table.model.js'
import { normalizeTableStatus, validateTableInput } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import { DuplicatedTableNumberError, TableNotFoundError } from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    restaurantId: string
    number: number
    description?: string | null
    capacity: number
}

export interface UpdateTableDTO {
    number: number
    description?: string | null
    capacity: number
    status?: string
}

export class TableService {
    constructor(private readonly tableRepository: TableRepository) {}

    async create(dto: CreateTableDTO): Promise<RestaurantTable> {
        const data = validateTableInput(dto)
        await this.assertNumberAvailable(dto.restaurantId, data.number)

        const now = new Date().toISOString()
        const table: RestaurantTable = {
            id: randomUUID(),
            restaurantId: dto.restaurantId,
            ...data,
            status: 'libre',
            createdAt: now,
            updatedAt: now
        }
        await this.tableRepository.save(table)
        return table
    }

    async findByRestaurantId(restaurantId: string): Promise<RestaurantTable[]> {
        return this.tableRepository.findByRestaurantId(restaurantId)
    }

    async findById(restaurantId: string, id: string): Promise<RestaurantTable> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    async update(restaurantId: string, id: string, dto: UpdateTableDTO): Promise<RestaurantTable> {
        const existing = await this.findById(restaurantId, id)
        const data = validateTableInput(dto)
        if (data.number !== existing.number) {
            await this.assertNumberAvailable(restaurantId, data.number)
        }

        const updated: RestaurantTable = {
            ...existing,
            ...data,
            status: dto.status === undefined ? existing.status : normalizeTableStatus(dto.status),
            updatedAt: new Date().toISOString()
        }
        await this.tableRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        await this.findById(restaurantId, id)
        await this.tableRepository.delete(id)
    }

    private async assertNumberAvailable(restaurantId: string, number: number): Promise<void> {
        const duplicated = await this.tableRepository.findByRestaurantAndNumber(restaurantId, number)
        if (duplicated) {
            throw new DuplicatedTableNumberError()
        }
    }
}
