import { describe, it, expect } from 'vitest'
import { calculatePoints, calculateOrderTotal, validatePointsRule } from './points.model.js'
import { InvalidPointsRuleError } from '@errors/DomainErrors.js'
import type { Order } from './order.model.js'

describe('calculatePoints', () => {
    const rule = { restaurantId: 'r1', eurosPerBlock: 10, pointsPerBlock: 2 }

    it('da Y puntos por cada X euros completos', () => {
        expect(calculatePoints(35, rule)).toBe(6)
    })

    it('no da puntos si no se llega a un bloque completo', () => {
        expect(calculatePoints(9.99, rule)).toBe(0)
    })

    it('evita errores de redondeo con decimales', () => {
        expect(calculatePoints(30.1 - 0.1, { ...rule, eurosPerBlock: 10, pointsPerBlock: 1 })).toBe(3)
    })
})

describe('calculateOrderTotal', () => {
    it('suma el precio por la cantidad de cada item', () => {
        const order = {
            items: [
                { id: 'a', dishId: 'd', quantity: 1, notes: null, status: 'entregado', dishPrice: 12.5 },
                { id: 'b', dishId: 'e', quantity: 2, notes: null, status: 'entregado', dishPrice: 2.25 }
            ]
        } as Order
        expect(calculateOrderTotal(order)).toBe(17)
    })

    it('ignora items sin precio', () => {
        const order = { items: [{ id: 'a', dishId: 'd', quantity: 1, notes: null, status: 'entregado' }] } as Order
        expect(calculateOrderTotal(order)).toBe(0)
    })
})

describe('validatePointsRule', () => {
    it('acepta valores positivos', () => {
        expect(validatePointsRule(10, 1)).toEqual({ eurosPerBlock: 10, pointsPerBlock: 1 })
    })

    it.each([[0, 1], [-5, 1], [10, 0], [10, -1], [10, 1.5], [NaN, 1]])('rechaza euros=%s puntos=%s', (euros, pts) => {
        expect(() => validatePointsRule(euros, pts)).toThrow(InvalidPointsRuleError)
    })
})
