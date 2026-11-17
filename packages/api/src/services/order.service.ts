import { randomUUID } from 'crypto'
import type { Order, OrderItem, OrderPack } from '@models/order.model.js'
import { normalizeOrderStatus, canRoleUpdateItemStatus, isOrderFullyDelivered } from '@models/order.model.js'
import type { PointsService } from '@services/points.service.js'
import type { PackService } from '@services/pack.service.js'
import type { DishRepository } from '@repositories/dish.repository.js'
import type { PackSelection } from '@models/pack.model.js'
import { validatePackSelection } from '@models/pack.model.js'
import type { OrderRepository } from '@repositories/order.repository.js'
import { RestaurantIdRequiredError, OrderNotFoundError, ForbiddenItemStatusUpdateError, InvalidPackError } from '@errors/DomainErrors.js'

export interface PackOrderRequest {
    packId: string
    quantity: number
    selections: PackSelection[]
}

export interface CreateOrderRequest {
    restaurantId: string
    tableId: string | null
    clientId: string | null
    items: {
        dishId: string
        quantity: number
        notes: string | null
    }[]
    packs?: PackOrderRequest[] | undefined
}

export class OrderService {
    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly pointsService?: PointsService,
        private readonly packService?: PackService,
        private readonly dishRepository?: DishRepository
    ) {}

    async create(request: CreateOrderRequest): Promise<Order> {
        if (!request.restaurantId || request.restaurantId.trim() === '') {
            throw new RestaurantIdRequiredError()
        }

        const items: OrderItem[] = []
        for (const item of request.items) {
            for (let i = 0; i < item.quantity; i++) {
                items.push({
                    id: randomUUID(),
                    dishId: item.dishId,
                    quantity: 1,
                    notes: item.notes,
                    status: 'pendiente'
                })
            }
        }

        const packs = await this.buildPacks(request, items)

        const order: Order = {
            id: randomUUID(),
            restaurantId: request.restaurantId,
            tableId: request.tableId,
            clientId: request.clientId,
            createdAt: new Date(),
            items,
            ...(packs.length > 0 ? { packs } : {})
        }

        await this.orderRepository.create(order)

        return order
    }

    /**
     * Valida los packs pedidos y añade a `items` un item por cada plato elegido.
     * Devuelve los packs del pedido, con el nombre y el precio del momento.
     */
    private async buildPacks(request: CreateOrderRequest, items: OrderItem[]): Promise<OrderPack[]> {
        const requested = request.packs ?? []
        if (requested.length === 0) return []
        if (!this.packService || !this.dishRepository) {
            throw new Error('Los packs no están configurados')
        }

        const dishes = await this.dishRepository.findByRestaurantId(request.restaurantId)
        const orderPacks: OrderPack[] = []
        for (const packRequest of requested) {
            if (!Number.isInteger(packRequest.quantity) || packRequest.quantity < 1) {
                throw new InvalidPackError('La cantidad de packs debe ser un entero mayor que 0')
            }
            const pack = await this.packService.findById(request.restaurantId, packRequest.packId)
            const selections = validatePackSelection(pack, packRequest.selections ?? [], dishes)

            for (let i = 0; i < packRequest.quantity; i++) {
                const orderPack: OrderPack = { id: randomUUID(), packId: pack.id, name: pack.name, price: pack.price }
                orderPacks.push(orderPack)
                for (const selection of selections) {
                    items.push({
                        id: randomUUID(),
                        dishId: selection.dishId,
                        quantity: 1,
                        notes: null,
                        status: 'pendiente',
                        orderPackId: orderPack.id
                    })
                }
            }
        }
        return orderPacks
    }

    async listActive(restaurantId: string): Promise<Order[]> {
        return this.orderRepository.findActiveByRestaurant(restaurantId)
    }

    async getById(orderId: string): Promise<Order> {
        const order = await this.orderRepository.findById(orderId)
        if (!order) {
            throw new OrderNotFoundError()
        }
        return order
    }

    async getByClientId(clientId: string): Promise<Order[]> {
        return this.orderRepository.findByClientId(clientId)
    }

    async updateItemStatus(orderId: string, itemId: string, status: string, role?: string): Promise<void> {
        const order = await this.orderRepository.findById(orderId)
        if (!order) {
            throw new OrderNotFoundError()
        }

        const item = order.items.find(i => i.id === itemId)
        if (!item) {
            throw new OrderNotFoundError() // Or ItemNotFoundError
        }

        const normalizedStatus = normalizeOrderStatus(status)
        // Sin rol (uso interno) no se comprueban permisos; el controller siempre lo informa
        if (role !== undefined && !canRoleUpdateItemStatus(role, item.dishCategory, normalizedStatus)) {
            throw new ForbiddenItemStatusUpdateError()
        }
        item.status = normalizedStatus

        await this.orderRepository.updateItemStatus(orderId, itemId, normalizedStatus)

        // Al entregarse el último item el cliente gana los puntos del pedido
        if (this.pointsService && isOrderFullyDelivered(order)) {
            await this.pointsService.awardForOrder(order)
        }
    }
}
