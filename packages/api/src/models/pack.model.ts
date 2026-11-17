import { InvalidCategoryError, InvalidPackError, InvalidPackSelectionError } from '@errors/DomainErrors.js'
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

export interface PackSelection {
    slotId: string
    dishId: string
}

/** Datos de un plato necesarios para validar una elección */
export interface SelectableDish {
    id: string
    category: string
    available: boolean
    restaurantId: string
}

/**
 * Comprueba que el cliente ha elegido exactamente un plato por hueco y que cada plato es válido:
 * del mismo restaurante, disponible, de la categoría del hueco y no bloqueado.
 */
export function validatePackSelection(pack: Pack, selections: PackSelection[], dishes: SelectableDish[]): PackSelection[] {
    if (!pack.available) {
        throw new InvalidPackSelectionError('El pack no está disponible')
    }

    const slotIds = new Set(pack.slots.map(s => s.id))
    const chosenSlots = new Set<string>()
    for (const selection of selections) {
        if (!slotIds.has(selection.slotId)) {
            throw new InvalidPackSelectionError('La elección incluye un hueco que no pertenece al pack')
        }
        if (chosenSlots.has(selection.slotId)) {
            throw new InvalidPackSelectionError('Cada hueco del pack solo admite una elección')
        }
        chosenSlots.add(selection.slotId)
    }
    if (chosenSlots.size !== pack.slots.length) {
        throw new InvalidPackSelectionError('Debes elegir un plato para cada hueco del pack')
    }

    for (const selection of selections) {
        const slot = pack.slots.find(s => s.id === selection.slotId)!
        const dish = dishes.find(d => d.id === selection.dishId)
        if (!dish || dish.restaurantId !== pack.restaurantId) {
            throw new InvalidPackSelectionError('El plato elegido no existe en este restaurante')
        }
        if (!dish.available) {
            throw new InvalidPackSelectionError('El plato elegido no está disponible')
        }
        if (dish.category !== slot.category) {
            throw new InvalidPackSelectionError(`El plato elegido no es de la categoría ${slot.category}`)
        }
        if (slot.excludedDishIds.includes(dish.id)) {
            throw new InvalidPackSelectionError('El plato elegido no se puede elegir en este pack')
        }
    }

    return selections.map(s => ({ slotId: s.slotId, dishId: s.dishId }))
}
