import { describe, it, expect } from 'vitest'
import { validatePointsRewardInput } from './points-reward.model.js'
import { InvalidPointsRewardError } from '@errors/DomainErrors.js'

describe('validatePointsRewardInput', () => {
    it('acepta puntos enteros y un descuento positivo', () => {
        expect(validatePointsRewardInput({ points: 10, discount: 1 })).toEqual({ points: 10, discount: 1 })
        expect(validatePointsRewardInput({ points: 100, discount: 12.5 })).toEqual({ points: 100, discount: 12.5 })
    })

    it.each([0, -10, 2.5, NaN])('rechaza los puntos %s', points => {
        expect(() => validatePointsRewardInput({ points, discount: 1 })).toThrow(InvalidPointsRewardError)
    })

    it.each([0, -1, NaN])('rechaza el descuento %s', discount => {
        expect(() => validatePointsRewardInput({ points: 10, discount })).toThrow(InvalidPointsRewardError)
    })
})
