import { describe, it, expect, beforeEach } from 'vitest'
import { PointsService } from './points.service.js'
import { MockPointsRepository } from '@repositories/mocks/MockPointsRepository.js'
import type { Order } from '@models/order.model.js'
import { InsufficientPointsError, InvalidPointsRewardError } from '@errors/DomainErrors.js'

const deliveredOrder = (overrides: Partial<Order> = {}): Order => ({
    id: 'o1',
    restaurantId: 'r1',
    tableId: null,
    clientId: 'c1',
    createdAt: new Date(),
    items: [
        { id: 'i1', dishId: 'd1', quantity: 1, notes: null, status: 'entregado', dishPrice: 25 },
        { id: 'i2', dishId: 'd2', quantity: 1, notes: null, status: 'entregado', dishPrice: 10 }
    ],
    ...overrides
})

describe('PointsService', () => {
    let repo: MockPointsRepository
    let service: PointsService

    beforeEach(() => {
        repo = new MockPointsRepository()
        service = new PointsService(repo)
    })

    it('usa la regla por defecto si el restaurante no ha configurado ninguna', async () => {
        expect(await service.getRule('r1')).toEqual({ restaurantId: 'r1', eurosPerBlock: 10, pointsPerBlock: 1 })
    })

    it('guarda y devuelve la regla configurada', async () => {
        await service.setRule('r1', 5, 2)
        expect(await service.getRule('r1')).toEqual({ restaurantId: 'r1', eurosPerBlock: 5, pointsPerBlock: 2 })
    })

    it('da puntos al cliente cuando el pedido está entregado', async () => {
        await service.setRule('r1', 5, 2)
        const earned = await service.awardForOrder(deliveredOrder())
        expect(earned).toBe(14) // 35 € -> 7 bloques x 2
        expect(await service.getBalance('c1', 'r1')).toBe(14)
    })

    it('no da puntos dos veces por el mismo pedido', async () => {
        await service.awardForOrder(deliveredOrder())
        const second = await service.awardForOrder(deliveredOrder())
        expect(second).toBe(0)
        expect(await service.getBalance('c1', 'r1')).toBe(3)
    })

    it('no da puntos si el pedido no tiene cliente', async () => {
        expect(await service.awardForOrder(deliveredOrder({ clientId: null }))).toBe(0)
    })

    it('no da puntos si el pedido no está entregado del todo', async () => {
        const order = deliveredOrder()
        order.items[1]!.status = 'listo'
        expect(await service.awardForOrder(order)).toBe(0)
        expect(await service.getBalance('c1', 'r1')).toBe(0)
    })

    it('el saldo es independiente por restaurante', async () => {
        await service.awardForOrder(deliveredOrder())
        expect(await service.getBalance('c1', 'r2')).toBe(0)
    })

    describe('redeem', () => {
        beforeEach(async () => {
            await service.awardForOrder(deliveredOrder()) // 35 € -> 3 puntos con la regla por defecto
            await service.setRule('r1', 1, 1)
            await service.awardForOrder(deliveredOrder({ id: 'o2' })) // 35 puntos más
        })

        it('descuenta los puntos canjeados del saldo', async () => {
            expect(await service.getBalance('c1', 'r1')).toBe(38)
            expect(await service.redeem('c1', 'r1', 'o-canje', 10)).toBe(true)
            expect(await service.getBalance('c1', 'r1')).toBe(28)
        })

        it('falla si no hay puntos suficientes y no cambia el saldo', async () => {
            await expect(service.redeem('c1', 'r1', 'o-canje', 39)).rejects.toThrow(InsufficientPointsError)
            expect(await service.getBalance('c1', 'r1')).toBe(38)
        })

        it('no canjea dos veces el mismo pedido', async () => {
            await service.redeem('c1', 'r1', 'o-canje', 10)
            expect(await service.redeem('c1', 'r1', 'o-canje', 10)).toBe(false)
            expect(await service.getBalance('c1', 'r1')).toBe(28)
        })

        it('rechaza canjear una cantidad que no sea un entero positivo', async () => {
            await expect(service.redeem('c1', 'r1', 'o-canje', 0)).rejects.toThrow(InvalidPointsRewardError)
            await expect(service.redeem('c1', 'r1', 'o-canje', 1.5)).rejects.toThrow(InvalidPointsRewardError)
        })
    })
})
