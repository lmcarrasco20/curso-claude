import { InvalidOrderStatusError } from '@errors/DomainErrors.js'

const VALID_ORDER_STATUSES = ['pendiente', 'preparando', 'listo', 'entregado'] as const

export type OrderStatusType = typeof VALID_ORDER_STATUSES[number]

export interface OrderItem {
    id: string
    dishId: string
    quantity: number
    notes: string | null
    status: OrderStatusType
    /** Pack al que pertenece el item, si se pidió dentro de un pack */
    orderPackId?: string | null
    dishName?: string
    dishPrice?: number
    dishCategory?: string
}

/** Pack pedido: guarda el nombre y el precio del momento del pedido */
export interface OrderPack {
    id: string
    packId: string
    name: string
    price: number
}

export interface Order {
    id: string
    restaurantId: string
    tableId: string | null
    /** Número de la mesa (solo lectura, se obtiene de la tabla de mesas) */
    tableNumber?: number | null
    clientId: string | null
    createdAt: Date
    items: OrderItem[]
    packs?: OrderPack[]
    restaurantName?: string
    restaurantLogoUrl?: string | null
}

export function normalizeOrderStatus(value: string): OrderStatusType {
    const normalized = value.toLowerCase().trim()
    if (!VALID_ORDER_STATUSES.includes(normalized as OrderStatusType)) {
        throw new InvalidOrderStatusError(`Estado inválido: ${value}. Debe ser uno de: ${VALID_ORDER_STATUSES.join(', ')}`)
    }
    return normalized as OrderStatusType
}

export function isOrderFullyDelivered(order: Order): boolean {
    return order.items.length > 0 && order.items.every(item => item.status === 'entregado')
}

/**
 * Indica si un rol puede cambiar un item a un estado concreto:
 * - cocinero: platos (no bebidas) -> preparando / listo
 * - camarero: bebidas (barra) -> cualquier estado; cualquier item -> entregado (salón)
 * - manager y admin: todo
 */
export function canRoleUpdateItemStatus(role: string, dishCategory: string | undefined, status: OrderStatusType): boolean {
    const isDrink = dishCategory?.toLowerCase() === 'bebida'
    switch (role) {
        case 'admin':
        case 'manager':
            return true
        case 'cocinero':
            return !isDrink && (status === 'preparando' || status === 'listo')
        case 'camarero':
            return isDrink || status === 'entregado'
        default:
            return false
    }
}
