import { describe, it, expect, beforeEach } from 'vitest'
import { DiscountService } from './discount.service.js'
import { MockDiscountRepository } from '@repositories/mocks/MockDiscountRepository.js'
import {
    DiscountCodeNotFoundError,
    DuplicatedDiscountCodeError,
    InvalidDiscountCodeError,
    InvalidDiscountError
} from '@errors/DomainErrors.js'

describe('DiscountService', () => {
    let repo: MockDiscountRepository
    let service: DiscountService

    beforeEach(() => {
        repo = new MockDiscountRepository()
        service = new DiscountService(repo)
    })

    it('crea un código en mayúsculas y activo por defecto', async () => {
        const discount = await service.create({ restaurantId: 'r1', code: ' verano10 ', type: 'porcentaje', value: 10 })
        expect(discount).toMatchObject({ restaurantId: 'r1', code: 'VERANO10', type: 'porcentaje', value: 10, active: true })
        expect(discount.id).toBeTruthy()
        expect(await repo.findById(discount.id)).not.toBeNull()
    })

    it('rechaza datos inválidos', async () => {
        await expect(service.create({ restaurantId: 'r1', code: 'X', type: 'porcentaje', value: 150 })).rejects.toThrow(InvalidDiscountError)
    })

    it('rechaza un código repetido en el restaurante (sin distinguir mayúsculas) pero lo permite en otro', async () => {
        await service.create({ restaurantId: 'r1', code: 'VERANO10', type: 'porcentaje', value: 10 })
        await expect(service.create({ restaurantId: 'r1', code: 'verano10', type: 'importe', value: 2 })).rejects.toThrow(DuplicatedDiscountCodeError)
        await expect(service.create({ restaurantId: 'r2', code: 'VERANO10', type: 'importe', value: 2 })).resolves.toBeDefined()
    })

    it('lista los códigos del restaurante', async () => {
        await service.create({ restaurantId: 'r1', code: 'B', type: 'importe', value: 1 })
        await service.create({ restaurantId: 'r1', code: 'A', type: 'importe', value: 1 })
        await service.create({ restaurantId: 'r2', code: 'C', type: 'importe', value: 1 })
        expect((await service.findByRestaurantId('r1')).map(d => d.code)).toEqual(['A', 'B'])
    })

    it('obtiene un código y falla si no existe o es de otro restaurante', async () => {
        const discount = await service.create({ restaurantId: 'r1', code: 'A', type: 'importe', value: 1 })
        expect((await service.findById('r1', discount.id)).id).toBe(discount.id)
        await expect(service.findById('r1', 'no-existe')).rejects.toThrow(DiscountCodeNotFoundError)
        await expect(service.findById('r2', discount.id)).rejects.toThrow(DiscountCodeNotFoundError)
    })

    it('actualiza un código conservando su identificador y permite conservar su propio código', async () => {
        const discount = await service.create({ restaurantId: 'r1', code: 'A', type: 'importe', value: 1 })
        const updated = await service.update('r1', discount.id, { code: 'a', type: 'porcentaje', value: 20, active: false })
        expect(updated).toMatchObject({ id: discount.id, code: 'A', type: 'porcentaje', value: 20, active: false })
    })

    it('no permite actualizar al código de otro descuento del restaurante', async () => {
        await service.create({ restaurantId: 'r1', code: 'A', type: 'importe', value: 1 })
        const b = await service.create({ restaurantId: 'r1', code: 'B', type: 'importe', value: 1 })
        await expect(service.update('r1', b.id, { code: 'A', type: 'importe', value: 1 })).rejects.toThrow(DuplicatedDiscountCodeError)
    })

    it('elimina un código y falla si no existe', async () => {
        const discount = await service.create({ restaurantId: 'r1', code: 'A', type: 'importe', value: 1 })
        await service.delete('r1', discount.id)
        expect(await repo.findById(discount.id)).toBeNull()
        await expect(service.delete('r1', discount.id)).rejects.toThrow(DiscountCodeNotFoundError)
    })

    describe('findUsableByCode', () => {
        it('devuelve el código activo sin distinguir mayúsculas', async () => {
            await service.create({ restaurantId: 'r1', code: 'VERANO10', type: 'porcentaje', value: 10 })
            expect((await service.findUsableByCode('r1', ' verano10')).code).toBe('VERANO10')
        })

        it('falla si el código no existe, está inactivo o es de otro restaurante', async () => {
            await service.create({ restaurantId: 'r1', code: 'VIEJO', type: 'importe', value: 1, active: false })
            await service.create({ restaurantId: 'r1', code: 'SOLOR1', type: 'importe', value: 1 })
            await expect(service.findUsableByCode('r1', 'NOEXISTE')).rejects.toThrow(InvalidDiscountCodeError)
            await expect(service.findUsableByCode('r1', 'VIEJO')).rejects.toThrow(InvalidDiscountCodeError)
            await expect(service.findUsableByCode('r2', 'SOLOR1')).rejects.toThrow(InvalidDiscountCodeError)
            await expect(service.findUsableByCode('r1', '')).rejects.toThrow(InvalidDiscountCodeError)
        })
    })
})
