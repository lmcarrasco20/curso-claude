import { describe, it, expect } from 'vitest'
import { calculateBill } from './bill.model.js'

describe('calculateBill', () => {
    it('sin descuentos el total es el subtotal', () => {
        expect(calculateBill({ subtotal: 40 })).toEqual({ subtotal: 40, codeDiscount: 0, pointsUsed: 0, pointsDiscount: 0, total: 40 })
    })

    it('aplica un código de porcentaje', () => {
        const bill = calculateBill({ subtotal: 40, code: { type: 'porcentaje', value: 10 } })
        expect(bill).toMatchObject({ codeDiscount: 4, pointsDiscount: 0, total: 36 })
    })

    it('aplica un código de importe fijo', () => {
        expect(calculateBill({ subtotal: 40, code: { type: 'importe', value: 5 } })).toMatchObject({ codeDiscount: 5, total: 35 })
    })

    it('canjea puntos por su descuento', () => {
        const bill = calculateBill({ subtotal: 40, reward: { points: 100, discount: 10 } })
        expect(bill).toMatchObject({ codeDiscount: 0, pointsUsed: 100, pointsDiscount: 10, total: 30 })
    })

    it('aplica primero el código y después los puntos sobre el importe restante', () => {
        const bill = calculateBill({ subtotal: 50, code: { type: 'porcentaje', value: 20 }, reward: { points: 100, discount: 10 } })
        expect(bill).toEqual({ subtotal: 50, codeDiscount: 10, pointsUsed: 100, pointsDiscount: 10, total: 30 })
    })

    it('el total nunca es negativo: el código no supera el subtotal', () => {
        expect(calculateBill({ subtotal: 6, code: { type: 'importe', value: 10 } })).toMatchObject({ codeDiscount: 6, total: 0 })
    })

    it('el descuento por puntos se limita al importe restante y solo gasta los puntos necesarios', () => {
        const bill = calculateBill({ subtotal: 5, reward: { points: 10, discount: 10 } })
        expect(bill).toMatchObject({ pointsDiscount: 5, pointsUsed: 5, total: 0 })
    })

    it('no gasta puntos si no queda nada que descontar', () => {
        const bill = calculateBill({ subtotal: 10, code: { type: 'porcentaje', value: 100 }, reward: { points: 100, discount: 10 } })
        expect(bill).toMatchObject({ codeDiscount: 10, pointsUsed: 0, pointsDiscount: 0, total: 0 })
    })

    it('redondea a céntimos', () => {
        const bill = calculateBill({ subtotal: 33.33, code: { type: 'porcentaje', value: 15 } })
        expect(bill).toMatchObject({ codeDiscount: 5, total: 28.33 })
    })
})
