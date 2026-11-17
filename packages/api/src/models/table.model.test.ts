import { describe, it, expect } from 'vitest'
import { normalizeTableStatus, validateTableInput } from './table.model.js'
import { InvalidTableError, InvalidTableStatusError } from '@errors/DomainErrors.js'

describe('normalizeTableStatus', () => {
    it.each(['libre', 'ocupada', 'reservada'])('acepta %s', status => {
        expect(normalizeTableStatus(status)).toBe(status)
    })

    it('ignora mayúsculas y espacios', () => {
        expect(normalizeTableStatus('  Ocupada ')).toBe('ocupada')
    })

    it('rechaza un estado desconocido', () => {
        expect(() => normalizeTableStatus('rota')).toThrow(InvalidTableStatusError)
    })
})

describe('validateTableInput', () => {
    it('devuelve los datos limpios', () => {
        expect(validateTableInput({ number: 3, description: '  Terraza  ', capacity: 4 }))
            .toEqual({ number: 3, description: 'Terraza', capacity: 4 })
    })

    it('convierte una descripción vacía o ausente en null', () => {
        expect(validateTableInput({ number: 1, description: '   ', capacity: 2 }).description).toBeNull()
        expect(validateTableInput({ number: 1, capacity: 2 }).description).toBeNull()
    })

    it.each([0, -1, 1.5, NaN])('rechaza el número de mesa %s', number => {
        expect(() => validateTableInput({ number, capacity: 2 })).toThrow(InvalidTableError)
    })

    it.each([0, -3, 2.5, NaN])('rechaza la capacidad %s', capacity => {
        expect(() => validateTableInput({ number: 1, capacity })).toThrow(InvalidTableError)
    })
})
