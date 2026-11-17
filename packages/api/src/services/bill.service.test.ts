import { describe, it, expect, beforeEach } from 'vitest'
import { BillService } from './bill.service.js'
import { DiscountService } from './discount.service.js'
import { PointsRewardService } from './points-reward.service.js'
import { PointsService } from './points.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockBillRepository } from '@repositories/mocks/MockBillRepository.js'
import { MockDiscountRepository } from '@repositories/mocks/MockDiscountRepository.js'
import { MockPointsRewardRepository } from '@repositories/mocks/MockPointsRewardRepository.js'
import { MockPointsRepository } from '@repositories/mocks/MockPointsRepository.js'
import type { Order } from '@models/order.model.js'
import {
    BillAlreadyRequestedError,
    InsufficientPointsError,
    InvalidDiscountCodeError,
    OrderNotFoundError,
    OrderNotOwnedError,
    PointsRewardNotFoundError
} from '@errors/DomainErrors.js'

describe('BillService', () => {
    let orders: MockOrderRepository
    let discounts: DiscountService
    let rewards: PointsRewardService
    let points: PointsService
    let service: BillService

    const buildOrder = (overrides: Partial<Order> = {}): Order => ({
        id: 'o1',
        restaurantId: 'r1',
        tableId: null,
        clientId: 'c1',
        createdAt: new Date(),
        items: [
            { id: 'i1', dishId: 'd1', quantity: 1, notes: null, status: 'entregado', dishPrice: 30 },
            { id: 'i2', dishId: 'd2', quantity: 1, notes: null, status: 'entregado', dishPrice: 20 }
        ],
        ...overrides
    })

    beforeEach(async () => {
        orders = new MockOrderRepository()
        discounts = new DiscountService(new MockDiscountRepository())
        rewards = new PointsRewardService(new MockPointsRewardRepository())
        points = new PointsService(new MockPointsRepository())
        service = new BillService(orders, new MockBillRepository(), discounts, rewards, points)
        await orders.create(buildOrder())
    })

    it('calcula la cuenta sin descuentos', async () => {
        const bill = await service.requestBill({ orderId: 'o1', clientId: 'c1' })
        expect(bill).toMatchObject({ orderId: 'o1', clientId: 'c1', restaurantId: 'r1', subtotal: 50, codeDiscount: 0, pointsDiscount: 0, total: 50, discountCode: null })
        expect(bill.id).toBeTruthy()
    })

    it('falla si el pedido no existe', async () => {
        await expect(service.requestBill({ orderId: 'no-existe', clientId: 'c1' })).rejects.toThrow(OrderNotFoundError)
    })

    it('solo el cliente dueño del pedido puede pedir la cuenta', async () => {
        await expect(service.requestBill({ orderId: 'o1', clientId: 'otro' })).rejects.toThrow(OrderNotOwnedError)
    })

    it('no se puede pedir la cuenta dos veces', async () => {
        await service.requestBill({ orderId: 'o1', clientId: 'c1' })
        await expect(service.requestBill({ orderId: 'o1', clientId: 'c1' })).rejects.toThrow(BillAlreadyRequestedError)
    })

    it('devuelve la cuenta guardada con getByOrder', async () => {
        const bill = await service.requestBill({ orderId: 'o1', clientId: 'c1' })
        expect(await service.getByOrder('o1', 'c1')).toEqual(bill)
        expect(await service.getByOrder('o1', 'otro').catch(e => e)).toBeInstanceOf(OrderNotOwnedError)
    })

    describe('código de descuento', () => {
        it('aplica un código válido sin distinguir mayúsculas', async () => {
            await discounts.create({ restaurantId: 'r1', code: 'VERANO10', type: 'porcentaje', value: 10 })
            const bill = await service.requestBill({ orderId: 'o1', clientId: 'c1', discountCode: 'verano10' })
            expect(bill).toMatchObject({ discountCode: 'VERANO10', codeDiscount: 5, total: 45 })
        })

        it('rechaza un código inexistente, inactivo o de otro restaurante', async () => {
            await discounts.create({ restaurantId: 'r1', code: 'VIEJO', type: 'importe', value: 5, active: false })
            await discounts.create({ restaurantId: 'r2', code: 'OTRO', type: 'importe', value: 5 })
            for (const code of ['NOEXISTE', 'VIEJO', 'OTRO']) {
                await expect(service.requestBill({ orderId: 'o1', clientId: 'c1', discountCode: code })).rejects.toThrow(InvalidDiscountCodeError)
            }
        })

        it('si el código falla no se guarda la cuenta y se puede volver a pedir', async () => {
            await expect(service.requestBill({ orderId: 'o1', clientId: 'c1', discountCode: 'NOEXISTE' })).rejects.toThrow(InvalidDiscountCodeError)
            await expect(service.requestBill({ orderId: 'o1', clientId: 'c1' })).resolves.toBeDefined()
        })
    })

    describe('canje de puntos', () => {
        let rewardId: string

        beforeEach(async () => {
            rewardId = (await rewards.create({ restaurantId: 'r1', points: 100, discount: 10 })).id
            await points.setRule('r1', 1, 1)
            // El cliente gana 120 puntos con otro pedido entregado
            await points.awardForOrder({
                id: 'o-previo', restaurantId: 'r1', tableId: null, clientId: 'c1', createdAt: new Date(),
                items: [{ id: 'x', dishId: 'd', quantity: 1, notes: null, status: 'entregado', dishPrice: 120 }]
            })
        })

        it('canjea puntos por su descuento y los resta del saldo', async () => {
            const bill = await service.requestBill({ orderId: 'o1', clientId: 'c1', pointsRewardId: rewardId })
            expect(bill).toMatchObject({ pointsUsed: 100, pointsDiscount: 10, total: 40 })
            expect(await points.getBalance('c1', 'r1')).toBe(20)
        })

        it('rechaza el canje si no hay puntos suficientes y no cambia el saldo', async () => {
            const caro = (await rewards.create({ restaurantId: 'r1', points: 500, discount: 50 })).id
            await expect(service.requestBill({ orderId: 'o1', clientId: 'c1', pointsRewardId: caro })).rejects.toThrow(InsufficientPointsError)
            expect(await points.getBalance('c1', 'r1')).toBe(120)
        })

        it('rechaza una equivalencia inexistente o de otro restaurante', async () => {
            const otro = (await rewards.create({ restaurantId: 'r2', points: 10, discount: 1 })).id
            await expect(service.requestBill({ orderId: 'o1', clientId: 'c1', pointsRewardId: 'no-existe' })).rejects.toThrow(PointsRewardNotFoundError)
            await expect(service.requestBill({ orderId: 'o1', clientId: 'c1', pointsRewardId: otro })).rejects.toThrow(PointsRewardNotFoundError)
        })

        it('combina código y puntos: primero el código, después los puntos', async () => {
            await discounts.create({ restaurantId: 'r1', code: 'MITAD', type: 'porcentaje', value: 50 })
            const bill = await service.requestBill({ orderId: 'o1', clientId: 'c1', discountCode: 'MITAD', pointsRewardId: rewardId })
            expect(bill).toMatchObject({ subtotal: 50, codeDiscount: 25, pointsDiscount: 10, total: 15 })
        })
    })
})
