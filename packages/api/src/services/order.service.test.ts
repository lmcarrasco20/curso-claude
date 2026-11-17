import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import type { Order } from '@models/order.model.js'
import { OrderNotFoundError, InvalidOrderStatusError, ForbiddenItemStatusUpdateError } from '@errors/DomainErrors.js'

describe('OrderService.updateItemStatus', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let testOrder: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo)

        testOrder = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            clientId: null,
            createdAt: new Date(),
            items: [
                { id: 'item-1', dishId: 'dish-1', quantity: 1, notes: null, status: 'pendiente' }
            ]
        }
        await repo.create(testOrder)
    })

    it('should update the status of an item successfully', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'preparando')
        const updatedItem = testOrder.items[0]!
        expect(updatedItem.status).toBe('preparando')
    })

    it('should throw an error if the order does not exist', async () => {
        await expect(service.updateItemStatus('order-bad', 'item-1', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw an error if the item does not exist inside the order', async () => {
        await expect(service.updateItemStatus('order-1', 'item-bad', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw DomainError if status is invalid', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'invalid-status'))
            .rejects.toThrow(InvalidOrderStatusError)
    })
})

describe('OrderService.updateItemStatus - permisos por rol', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let order: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo)
        order = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            clientId: null,
            createdAt: new Date(),
            items: [
                { id: 'plato', dishId: 'd1', quantity: 1, notes: null, status: 'pendiente', dishCategory: 'principal' },
                { id: 'bebida', dishId: 'd2', quantity: 1, notes: null, status: 'pendiente', dishCategory: 'bebida' }
            ]
        }
        await repo.create(order)
    })

    it('el cocinero puede preparar un plato', async () => {
        await service.updateItemStatus('order-1', 'plato', 'preparando', 'cocinero')
        expect(order.items[0]!.status).toBe('preparando')
    })

    it('el cocinero no puede modificar una bebida', async () => {
        await expect(service.updateItemStatus('order-1', 'bebida', 'listo', 'cocinero'))
            .rejects.toThrow(ForbiddenItemStatusUpdateError)
        expect(order.items[1]!.status).toBe('pendiente')
    })

    it('el camarero puede dejar lista una bebida', async () => {
        await service.updateItemStatus('order-1', 'bebida', 'listo', 'camarero')
        expect(order.items[1]!.status).toBe('listo')
    })

    it('el camarero no puede preparar un plato', async () => {
        await expect(service.updateItemStatus('order-1', 'plato', 'preparando', 'camarero'))
            .rejects.toThrow(ForbiddenItemStatusUpdateError)
        expect(order.items[0]!.status).toBe('pendiente')
    })

    it('el camarero puede entregar un plato listo', async () => {
        order.items[0]!.status = 'listo'
        await service.updateItemStatus('order-1', 'plato', 'entregado', 'camarero')
        expect(order.items[0]!.status).toBe('entregado')
    })

    it('el gerente puede modificar cualquier item', async () => {
        await service.updateItemStatus('order-1', 'plato', 'preparando', 'manager')
        await service.updateItemStatus('order-1', 'bebida', 'listo', 'manager')
        expect(order.items.map(i => i.status)).toEqual(['preparando', 'listo'])
    })

    it('un cliente no puede modificar items', async () => {
        await expect(service.updateItemStatus('order-1', 'plato', 'entregado', 'cliente'))
            .rejects.toThrow(ForbiddenItemStatusUpdateError)
    })
})
