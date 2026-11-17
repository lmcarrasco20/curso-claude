import { randomUUID } from 'crypto'
import type { RestaurantTable } from '@models/table.model.js'
import { normalizeTableStatus, validateTableInput } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import { DuplicatedTableNumberError, InvalidTableError, TableNotAvailableError, TableNotFoundError } from '@errors/DomainErrors.js'

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

    async changeStatus(restaurantId: string, id: string, status: string): Promise<RestaurantTable> {
        await this.findById(restaurantId, id)
        const normalized = normalizeTableStatus(status)
        await this.tableRepository.updateStatus(id, normalized, new Date().toISOString())
        return this.findById(restaurantId, id)
    }

    /** Mesas libres con capacidad para `people` comensales, de menor a mayor capacidad */
    async findAvailable(restaurantId: string, people: number): Promise<RestaurantTable[]> {
        if (!Number.isInteger(people) || people <= 0) {
            throw new InvalidTableError('El número de comensales debe ser un entero mayor que 0')
        }
        const tables = await this.tableRepository.findByRestaurantId(restaurantId)
        return tables
            .filter(t => t.status === 'libre' && t.capacity >= people)
            .sort((a, b) => a.capacity - b.capacity || a.number - b.number)
    }

    /** Pasa una mesa libre a ocupada. El cambio es atómico para que dos clientes no la ocupen a la vez. */
    async occupy(restaurantId: string, id: string): Promise<RestaurantTable> {
        const table = await this.findById(restaurantId, id)
        if (table.status !== 'libre') {
            throw new TableNotAvailableError()
        }
        const changed = await this.tableRepository.updateStatusIfCurrent(id, 'libre', 'ocupada', new Date().toISOString())
        if (!changed) {
            throw new TableNotAvailableError()
        }
        return this.findById(restaurantId, id)
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
