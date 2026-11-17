import { describe, it, expect } from 'vitest'
import { validatePackSelection } from './pack.model.js'
import type { Pack } from './pack.model.js'
import { InvalidPackSelectionError } from '@errors/DomainErrors.js'

const pack: Pack = {
    id: 'p1',
    restaurantId: 'r1',
    name: 'Menú',
    description: null,
    price: 20,
    available: true,
    slots: [
        { id: 's-entrante', category: 'entrante', excludedDishIds: [] },
        { id: 's-bebida', category: 'bebida', excludedDishIds: ['cerveza'] }
    ],
    createdAt: '',
    updatedAt: ''
}

const dishes = [
    { id: 'ensalada', category: 'entrante', available: true, restaurantId: 'r1' },
    { id: 'sopa', category: 'entrante', available: false, restaurantId: 'r1' },
    { id: 'agua', category: 'bebida', available: true, restaurantId: 'r1' },
    { id: 'cerveza', category: 'bebida', available: true, restaurantId: 'r1' },
    { id: 'pizza', category: 'principal', available: true, restaurantId: 'r1' },
    { id: 'ajena', category: 'bebida', available: true, restaurantId: 'r2' }
] as const

const valid = [
    { slotId: 's-entrante', dishId: 'ensalada' },
    { slotId: 's-bebida', dishId: 'agua' }
]

describe('validatePackSelection', () => {
    it('acepta una elección por hueco con platos permitidos', () => {
        expect(validatePackSelection(pack, valid, [...dishes])).toEqual(valid)
    })

    it('acepta la elección en cualquier orden', () => {
        const reversed = [...valid].reverse()
        expect(validatePackSelection(pack, reversed, [...dishes])).toHaveLength(2)
    })

    it('rechaza un pack no disponible', () => {
        expect(() => validatePackSelection({ ...pack, available: false }, valid, [...dishes])).toThrow(InvalidPackSelectionError)
    })

    it('rechaza si falta elegir algún hueco', () => {
        expect(() => validatePackSelection(pack, [valid[0]!], [...dishes])).toThrow(InvalidPackSelectionError)
        expect(() => validatePackSelection(pack, [], [...dishes])).toThrow(InvalidPackSelectionError)
    })

    it('rechaza elegir dos veces el mismo hueco', () => {
        const repeated = [valid[0]!, valid[0]!, valid[1]!]
        expect(() => validatePackSelection(pack, repeated, [...dishes])).toThrow(InvalidPackSelectionError)
    })

    it('rechaza un hueco que no pertenece al pack', () => {
        const unknown = [...valid, { slotId: 'otro', dishId: 'agua' }]
        expect(() => validatePackSelection(pack, unknown, [...dishes])).toThrow(InvalidPackSelectionError)
    })

    it('rechaza un plato de otra categoría', () => {
        const wrong = [{ slotId: 's-entrante', dishId: 'pizza' }, valid[1]!]
        expect(() => validatePackSelection(pack, wrong, [...dishes])).toThrow(InvalidPackSelectionError)
    })

    it('rechaza un plato bloqueado en ese hueco', () => {
        const blocked = [valid[0]!, { slotId: 's-bebida', dishId: 'cerveza' }]
        expect(() => validatePackSelection(pack, blocked, [...dishes])).toThrow(InvalidPackSelectionError)
    })

    it('rechaza un plato no disponible', () => {
        const unavailable = [{ slotId: 's-entrante', dishId: 'sopa' }, valid[1]!]
        expect(() => validatePackSelection(pack, unavailable, [...dishes])).toThrow(InvalidPackSelectionError)
    })

    it('rechaza un plato inexistente o de otro restaurante', () => {
        expect(() => validatePackSelection(pack, [valid[0]!, { slotId: 's-bebida', dishId: 'fantasma' }], [...dishes])).toThrow(InvalidPackSelectionError)
        expect(() => validatePackSelection(pack, [valid[0]!, { slotId: 's-bebida', dishId: 'ajena' }], [...dishes])).toThrow(InvalidPackSelectionError)
    })
})
