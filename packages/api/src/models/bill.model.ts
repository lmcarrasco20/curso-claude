import { calculateCodeDiscount } from '@models/discount.model.js'
import type { DiscountCode } from '@models/discount.model.js'

export interface BillCalculation {
    subtotal: number
    codeDiscount: number
    pointsUsed: number
    pointsDiscount: number
    total: number
}

export interface BillInput {
    /** Importe de los platos del pedido, sin descuentos */
    subtotal: number
    /** Código de descuento aplicado, si lo hay */
    code?: Pick<DiscountCode, 'type' | 'value'>
    /** Equivalencia de puntos canjeada, si la hay */
    reward?: { points: number; discount: number }
}

/** Cuenta definitiva de un pedido: se aplica primero el código y después el canje de puntos */
export interface Bill extends BillCalculation {
    id: string
    orderId: string
    clientId: string
    restaurantId: string
    discountCode: string | null
    createdAt: string
}

const toCents = (euros: number) => Math.round(euros * 100)

export function calculateBill(input: BillInput): BillCalculation {
    const subtotalCents = toCents(input.subtotal)

    const codeDiscountCents = input.code ? toCents(calculateCodeDiscount(input.subtotal, input.code)) : 0
    const remainingCents = subtotalCents - codeDiscountCents

    let pointsDiscountCents = 0
    let pointsUsed = 0
    if (input.reward && remainingCents > 0) {
        pointsDiscountCents = Math.min(remainingCents, toCents(input.reward.discount))
        // Si el descuento queda limitado por el importe restante solo se gastan los puntos proporcionales
        pointsUsed = Math.ceil(input.reward.points * pointsDiscountCents / toCents(input.reward.discount))
    }

    return {
        subtotal: subtotalCents / 100,
        codeDiscount: codeDiscountCents / 100,
        pointsUsed,
        pointsDiscount: pointsDiscountCents / 100,
        total: (remainingCents - pointsDiscountCents) / 100
    }
}
