import { describe, it, expect } from 'vitest'
import { validatePackInput } from './pack.model.js'
import { InvalidPackError } from '@errors/DomainErrors.js'

const validInput = () => ({
    name: 'Menú del día',
    price: 20,
    slots: [{ category: 'entrante' }, { category: 'principal' }, { category: 'bebida', excludedDishIds: ['cerveza'] }]
})

describe('validatePackInput', () => {
    it('devuelve los datos limpios con valores por defecto', () => {
        expect(validatePackInput(validInput())).toEqual({
            name: 'Menú del día',
            description: null,
            price: 20,
            available: true,
            slots: [
                { category: 'entrante', excludedDishIds: [] },
                { category: 'principal', excludedDishIds: [] },
                { category: 'bebida', excludedDishIds: ['cerveza'] }
            ]
        })
    })

    it('recorta el nombre y la descripción y respeta available=false', () => {
        const pack = validatePackInput({ ...validInput(), name: '  Menú  ', description: '  Con postre  ', available: false })
        expect(pack).toMatchObject({ name: 'Menú', description: 'Con postre', available: false })
    })

    it('convierte una descripción vacía en null', () => {
        expect(validatePackInput({ ...validInput(), description: '   ' }).description).toBeNull()
    })

    it('normaliza la categoría de cada hueco', () => {
        const pack = validatePackInput({ ...validInput(), slots: [{ category: ' Bebida ' }] })
        expect(pack.slots[0]!.category).toBe('bebida')
    })

    it('elimina los platos bloqueados repetidos', () => {
        const pack = validatePackInput({ ...validInput(), slots: [{ category: 'bebida', excludedDishIds: ['a', 'b', 'a'] }] })
        expect(pack.slots[0]!.excludedDishIds).toEqual(['a', 'b'])
    })

    it.each(['', '   '])('rechaza el nombre "%s"', name => {
        expect(() => validatePackInput({ ...validInput(), name })).toThrow(InvalidPackError)
    })

    it.each([0, -5, NaN])('rechaza el precio %s', price => {
        expect(() => validatePackInput({ ...validInput(), price })).toThrow(InvalidPackError)
    })

    it('exige al menos un hueco', () => {
        expect(() => validatePackInput({ ...validInput(), slots: [] })).toThrow(InvalidPackError)
    })

    it('rechaza una categoría desconocida', () => {
        expect(() => validatePackInput({ ...validInput(), slots: [{ category: 'sushi' }] })).toThrow(InvalidPackError)
    })
})
