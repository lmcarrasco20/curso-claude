import { InvalidCategoryError, InvalidPackError } from '@errors/DomainErrors.js'
import type { DishCategoryType } from '@models/dish.model.js'
import { normalizeDishCategory } from '@models/dish.model.js'

/** Hueco de un pack: el cliente elige un plato de esta categoría, salvo los bloqueados */
export interface PackSlot {
    id: string
    category: DishCategoryType
    /** Platos que no se pueden elegir en este hueco (por ejemplo, la cerveza en las bebidas del pack) */
    excludedDishIds: string[]
}

export interface Pack {
    id: string
    restaurantId: string
    name: string
    description: string | null
    /** Precio cerrado del pack */
    price: number
    available: boolean
    slots: PackSlot[]
    createdAt: string
    updatedAt: string
}

export interface PackInput {
    name: string
    description?: string | null
    price: number
    available?: boolean
    slots: { category: string; excludedDishIds?: string[] }[]
}

export interface ValidPackInput {
    name: string
    description: string | null
    price: number
    available: boolean
    slots: { category: DishCategoryType; excludedDishIds: string[] }[]
}

export function validatePackInput(input: PackInput): ValidPackInput {
    const name = String(input.name ?? '').trim()
    if (name === '') {
        throw new InvalidPackError('El nombre del pack es obligatorio')
    }
    if (!Number.isFinite(input.price) || input.price <= 0) {
        throw new InvalidPackError('El precio del pack debe ser un número mayor que 0')
    }
    if (!Array.isArray(input.slots) || input.slots.length === 0) {
        throw new InvalidPackError('El pack debe tener al menos un hueco')
    }

    const slots = input.slots.map(slot => {
        let category: DishCategoryType
        try {
            category = normalizeDishCategory(String(slot.category ?? ''))
        } catch (error) {
            if (error instanceof InvalidCategoryError) {
                throw new InvalidPackError(`Categoría de hueco inválida: ${slot.category}`)
            }
            throw error
        }
        return { category, excludedDishIds: [...new Set(slot.excludedDishIds ?? [])] }
    })

    return {
        name,
        description: input.description?.trim() || null,
        price: input.price,
        available: input.available ?? true,
        slots
    }
}
