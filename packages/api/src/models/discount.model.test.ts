import { describe, it, expect } from 'vitest'
import { calculateCodeDiscount, normalizeDiscountCode, validateDiscountInput } from './discount.model.js'
import { InvalidDiscountError } from '@errors/DomainErrors.js'

describe('normalizeDiscountCode', () => {
    it('recorta y pasa a mayúsculas', () => {
        expect(normalizeDiscountCode('  verano10 ')).toBe('VERANO10')
    })

    it.each(['', '   ', 'DOS PALABRAS'])('rechaza "%s"', code => {
        expect(() => normalizeDiscountCode(code)).toThrow(InvalidDiscountError)
    })
})

describe('validateDiscountInput', () => {
    it('acepta un porcentaje entre 1 y 100 y activa el código por defecto', () => {
        expect(validateDiscountInput({ code: 'ok', type: 'porcentaje', value: 15 }))
            .toEqual({ code: 'OK', type: 'porcentaje', value: 15, active: true })
    })

    it('acepta un importe fijo y respeta active=false', () => {
        expect(validateDiscountInput({ code: 'ok', type: 'importe', value: 5.5, active: false }))
            .toEqual({ code: 'OK', type: 'importe', value: 5.5, active: false })
    })

    it.each([0, -5, 101, NaN])('rechaza el porcentaje %s', value => {
        expect(() => validateDiscountInput({ code: 'ok', type: 'porcentaje', value })).toThrow(InvalidDiscountError)
    })

    it.each([0, -1, NaN])('rechaza el importe %s', value => {
        expect(() => validateDiscountInput({ code: 'ok', type: 'importe', value })).toThrow(InvalidDiscountError)
    })

    it('rechaza un tipo desconocido', () => {
        expect(() => validateDiscountInput({ code: 'ok', type: 'regalo' as any, value: 1 })).toThrow(InvalidDiscountError)
    })
})

describe('calculateCodeDiscount', () => {
    it('aplica el porcentaje sobre el total', () => {
        expect(calculateCodeDiscount(50, { type: 'porcentaje', value: 10 })).toBe(5)
    })

    it('redondea a céntimos', () => {
        expect(calculateCodeDiscount(33.33, { type: 'porcentaje', value: 15 })).toBe(5)
    })

    it('aplica el importe fijo', () => {
        expect(calculateCodeDiscount(50, { type: 'importe', value: 8 })).toBe(8)
    })

    it('el descuento nunca supera el total', () => {
        expect(calculateCodeDiscount(6, { type: 'importe', value: 10 })).toBe(6)
        expect(calculateCodeDiscount(0, { type: 'porcentaje', value: 50 })).toBe(0)
    })
})
