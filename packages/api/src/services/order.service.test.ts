import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { PointsService } from './points.service.js'
import { MockPointsRepository } from '@repositories/mocks/MockPointsRepository.js'
import { MockPackRepository } from '@repositories/mocks/MockPackRepository.js'
import { MockDishRepository } from '@repositories/mocks/MockDishRepository.js'
import { PackService } from './pack.service.js'
import type { Dish } from '@models/dish.model.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import type { Order } from '@models/order.model.js'
import { OrderNotFoundError, InvalidOrderStatusError, ForbiddenItemStatusUpdateError, InvalidPackSelectionError, PackNotFoundError, InvalidPackError } from '@errors/DomainErrors.js'

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

describe('OrderService.updateItemStatus - puntos', () => {
    it('da puntos al cliente cuando se entrega el último item del pedido', async () => {
        const repo = new MockOrderRepository()
        const points = new PointsService(new MockPointsRepository())
        const service = new OrderService(repo, points)
        await points.setRule('rest-1', 5, 1)
        await repo.create({
            id: 'o1', restaurantId: 'rest-1', tableId: null, clientId: 'cliente-1', createdAt: new Date(),
            items: [
                { id: 'a', dishId: 'd1', quantity: 1, notes: null, status: 'entregado', dishPrice: 10, dishCategory: 'principal' },
                { id: 'b', dishId: 'd2', quantity: 1, notes: null, status: 'listo', dishPrice: 10, dishCategory: 'principal' }
            ]
        })

        await service.updateItemStatus('o1', 'a', 'entregado', 'camarero')
        expect(await points.getBalance('cliente-1', 'rest-1')).toBe(0)

        await service.updateItemStatus('o1', 'b', 'entregado', 'camarero')
        expect(await points.getBalance('cliente-1', 'rest-1')).toBe(4)
    })
})

describe('OrderService.create - packs', () => {
    let orders: MockOrderRepository
    let dishes: MockDishRepository
    let packs: PackService
    let service: OrderService
    let pack: Awaited<ReturnType<PackService['create']>>
    let entranteSlot: string
    let bebidaSlot: string

    const buildDish = (id: string, category: Dish['category'], overrides: Partial<Dish> = {}): Dish => ({
        id, name: id, description: null, price: 5, category, available: true, restaurantId: 'r1', ingredients: [], createdAt: '', updatedAt: '', ...overrides
    })

    beforeEach(async () => {
        orders = new MockOrderRepository()
        dishes = new MockDishRepository()
        packs = new PackService(new MockPackRepository())
        service = new OrderService(orders, undefined, packs, dishes)
        for (const dish of [buildDish('ensalada', 'entrante'), buildDish('agua', 'bebida'), buildDish('cerveza', 'bebida'), buildDish('pizza', 'principal', { price: 12 })]) {
            await dishes.save(dish)
        }
        pack = await packs.create({
            restaurantId: 'r1', name: 'Menú', price: 15,
            slots: [{ category: 'entrante' }, { category: 'bebida', excludedDishIds: ['cerveza'] }]
        })
        entranteSlot = pack.slots[0]!.id
        bebidaSlot = pack.slots[1]!.id
    })

    const request = (extra: object = {}) => ({
        restaurantId: 'r1', tableId: null, clientId: 'c1', items: [],
        packs: [{ packId: pack.id, quantity: 1, selections: [{ slotId: entranteSlot, dishId: 'ensalada' }, { slotId: bebidaSlot, dishId: 'agua' }] }],
        ...extra
    })

    it('un pedido con un pack genera un item pendiente por plato elegido y registra el pack con su precio', async () => {
        const order = await service.create(request())
        expect(order.packs).toEqual([{ id: expect.any(String), packId: pack.id, name: 'Menú', price: 15 }])
        expect(order.items.map(i => i.dishId).sort()).toEqual(['agua', 'ensalada'])
        expect(order.items.every(i => i.status === 'pendiente' && i.quantity === 1 && i.orderPackId === order.packs![0]!.id)).toBe(true)
        expect(orders.orders).toHaveLength(1)
    })

    it('quantity 2 crea dos packs con sus items', async () => {
        const order = await service.create(request({
            packs: [{ packId: pack.id, quantity: 2, selections: [{ slotId: entranteSlot, dishId: 'ensalada' }, { slotId: bebidaSlot, dishId: 'agua' }] }]
        }))
        expect(order.packs).toHaveLength(2)
        expect(order.items).toHaveLength(4)
        expect(new Set(order.items.map(i => i.orderPackId)).size).toBe(2)
    })

    it('combina platos sueltos y packs', async () => {
        const order = await service.create(request({ items: [{ dishId: 'pizza', quantity: 2, notes: null }] }))
        expect(order.items).toHaveLength(4)
        expect(order.items.filter(i => i.orderPackId === undefined || i.orderPackId === null)).toHaveLength(2)
    })

    it('rechaza una elección con un plato bloqueado y no guarda el pedido', async () => {
        await expect(service.create(request({
            packs: [{ packId: pack.id, quantity: 1, selections: [{ slotId: entranteSlot, dishId: 'ensalada' }, { slotId: bebidaSlot, dishId: 'cerveza' }] }]
        }))).rejects.toThrow(InvalidPackSelectionError)
        expect(orders.orders).toHaveLength(0)
    })

    it('rechaza una elección incompleta', async () => {
        await expect(service.create(request({
            packs: [{ packId: pack.id, quantity: 1, selections: [{ slotId: entranteSlot, dishId: 'ensalada' }] }]
        }))).rejects.toThrow(InvalidPackSelectionError)
    })

    it('rechaza un pack no disponible', async () => {
        await packs.update('r1', pack.id, { name: 'Menú', price: 15, available: false, slots: [{ category: 'entrante' }] })
        await expect(service.create(request())).rejects.toThrow(InvalidPackSelectionError)
    })

    it('rechaza un pack inexistente o de otro restaurante', async () => {
        await expect(service.create(request({ packs: [{ packId: 'no-existe', quantity: 1, selections: [] }] }))).rejects.toThrow(PackNotFoundError)
        await expect(service.create(request({ restaurantId: 'r2' }))).rejects.toThrow(PackNotFoundError)
    })

    it.each([0, -1, 1.5])('rechaza la cantidad de packs %s', async quantity => {
        await expect(service.create(request({
            packs: [{ packId: pack.id, quantity, selections: [{ slotId: entranteSlot, dishId: 'ensalada' }, { slotId: bebidaSlot, dishId: 'agua' }] }]
        }))).rejects.toThrow(InvalidPackError)
    })
})
