import { InvalidPointsRuleError } from '@errors/DomainErrors.js'
import type { Order } from '@models/order.model.js'

export interface PointsRule {
    restaurantId: string
    /** Euros que hay que gastar para completar un bloque (X) */
    eurosPerBlock: number
    /** Puntos que se ganan por cada bloque completo (Y) */
    pointsPerBlock: number
}

export interface PointsTransaction {
    id: string
    clientId: string
    restaurantId: string
    orderId: string
    points: number
    createdAt: string
}

export interface PointsRedemption {
    id: string
    clientId: string
    restaurantId: string
    orderId: string
    points: number
    createdAt: string
}

/** Regla que se aplica mientras el restaurante no configure la suya: 1 punto por cada 10 € */
export const DEFAULT_POINTS_RULE = { eurosPerBlock: 10, pointsPerBlock: 1 } as const

export function validatePointsRule(eurosPerBlock: number, pointsPerBlock: number): { eurosPerBlock: number; pointsPerBlock: number } {
    if (!Number.isFinite(eurosPerBlock) || eurosPerBlock <= 0) {
        throw new InvalidPointsRuleError('Los euros por bloque deben ser un número mayor que 0')
    }
    if (!Number.isInteger(pointsPerBlock) || pointsPerBlock <= 0) {
        throw new InvalidPointsRuleError('Los puntos por bloque deben ser un número entero mayor que 0')
    }
    return { eurosPerBlock, pointsPerBlock }
}

/** Importe total del pedido en euros (precio x cantidad de cada item) */
export function calculateOrderTotal(order: Order): number {
    const cents = order.items.reduce((sum, item) => sum + Math.round((item.dishPrice ?? 0) * 100) * item.quantity, 0)
    return cents / 100
}

/** Puntos ganados por un importe: Y puntos por cada X euros completos */
export function calculatePoints(total: number, rule: Pick<PointsRule, 'eurosPerBlock' | 'pointsPerBlock'>): number {
    // Se trabaja en céntimos para evitar errores de coma flotante
    const blocks = Math.floor(Math.round(total * 100) / Math.round(rule.eurosPerBlock * 100))
    return blocks * rule.pointsPerBlock
}
