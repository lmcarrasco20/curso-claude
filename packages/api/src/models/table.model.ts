import { InvalidTableError, InvalidTableStatusError } from '@errors/DomainErrors.js'

const VALID_TABLE_STATUSES = ['libre', 'ocupada', 'reservada'] as const

export type TableStatusType = typeof VALID_TABLE_STATUSES[number]

export interface RestaurantTable {
    id: string
    restaurantId: string
    number: number
    description: string | null
    capacity: number
    status: TableStatusType
    createdAt: string
    updatedAt: string
}

export interface TableInput {
    number: number
    description?: string | null
    capacity: number
}

export function normalizeTableStatus(value: string): TableStatusType {
    const normalized = String(value ?? '').toLowerCase().trim()
    if (!VALID_TABLE_STATUSES.includes(normalized as TableStatusType)) {
        throw new InvalidTableStatusError(`Estado de mesa inválido: ${value}. Debe ser uno de: ${VALID_TABLE_STATUSES.join(', ')}`)
    }
    return normalized as TableStatusType
}

export function validateTableInput(input: TableInput): { number: number; description: string | null; capacity: number } {
    if (!Number.isInteger(input.number) || input.number <= 0) {
        throw new InvalidTableError('El número de mesa debe ser un entero mayor que 0')
    }
    if (!Number.isInteger(input.capacity) || input.capacity <= 0) {
        throw new InvalidTableError('La capacidad debe ser un entero mayor que 0')
    }
    const description = input.description?.trim() || null
    return { number: input.number, description, capacity: input.capacity }
}
