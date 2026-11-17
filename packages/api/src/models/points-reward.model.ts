import { InvalidPointsRewardError } from '@errors/DomainErrors.js'

/** Equivalencia definida por el administrador: `points` puntos = `discount` euros de descuento */
export interface PointsReward {
    id: string
    restaurantId: string
    points: number
    /** Descuento en euros */
    discount: number
    createdAt: string
    updatedAt: string
}

export interface PointsRewardInput {
    points: number
    discount: number
}

export function validatePointsRewardInput(input: PointsRewardInput): PointsRewardInput {
    if (!Number.isInteger(input.points) || input.points <= 0) {
        throw new InvalidPointsRewardError('Los puntos deben ser un número entero mayor que 0')
    }
    if (!Number.isFinite(input.discount) || input.discount <= 0) {
        throw new InvalidPointsRewardError('El descuento debe ser un número mayor que 0')
    }
    return { points: input.points, discount: input.discount }
}
