import { InvalidDiscountError } from '@errors/DomainErrors.js'

const VALID_DISCOUNT_TYPES = ['porcentaje', 'importe'] as const

export type DiscountType = typeof VALID_DISCOUNT_TYPES[number]

export interface DiscountCode {
    id: string
    restaurantId: string
    code: string
    type: DiscountType
    /** Porcentaje (1-100) o euros fijos, según el tipo */
    value: number
    active: boolean
    createdAt: string
    updatedAt: string
}

export interface DiscountInput {
    code: string
    type: DiscountType
    value: number
    active?: boolean
}

export function normalizeDiscountCode(code: string): string {
    const normalized = String(code ?? '').trim().toUpperCase()
    if (normalized === '') {
        throw new InvalidDiscountError('El código de descuento es obligatorio')
    }
    if (/\s/.test(normalized)) {
        throw new InvalidDiscountError('El código de descuento no puede contener espacios')
    }
    return normalized
}

export function validateDiscountInput(input: DiscountInput): Required<DiscountInput> {
    const code = normalizeDiscountCode(input.code)

    if (!VALID_DISCOUNT_TYPES.includes(input.type)) {
        throw new InvalidDiscountError(`Tipo de descuento inválido: ${input.type}. Debe ser uno de: ${VALID_DISCOUNT_TYPES.join(', ')}`)
    }
    if (!Number.isFinite(input.value) || input.value <= 0) {
        throw new InvalidDiscountError('El valor del descuento debe ser un número mayor que 0')
    }
    if (input.type === 'porcentaje' && input.value > 100) {
        throw new InvalidDiscountError('El porcentaje de descuento no puede ser mayor que 100')
    }

    return { code, type: input.type, value: input.value, active: input.active ?? true }
}

/** Descuento en euros de un código sobre un total. Nunca supera el total. */
export function calculateCodeDiscount(total: number, discount: Pick<DiscountCode, 'type' | 'value'>): number {
    const cents = Math.round(total * 100)
    const raw = discount.type === 'porcentaje'
        ? Math.round(cents * discount.value / 100)
        : Math.round(discount.value * 100)
    return Math.min(cents, raw) / 100
}
