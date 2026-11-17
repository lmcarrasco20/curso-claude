import { describe, it, expect, beforeEach } from 'vitest'
import { PackService } from './pack.service.js'
import { MockPackRepository } from '@repositories/mocks/MockPackRepository.js'
import { InvalidPackError, PackNotFoundError } from '@errors/DomainErrors.js'

const input = () => ({
    name: 'Menú del día',
    description: 'Entrante, principal y bebida',
    price: 20,
    slots: [{ category: 'entrante' }, { category: 'principal' }, { category: 'bebida', excludedDishIds: ['cerveza'] }]
})

describe('PackService', () => {
    let repo: MockPackRepository
    let service: PackService

    beforeEach(() => {
        repo = new MockPackRepository()
        service = new PackService(repo)
    })

    it('crea un pack disponible con un identificador por hueco', async () => {
        const pack = await service.create({ restaurantId: 'r1', ...input() })
        expect(pack).toMatchObject({ restaurantId: 'r1', name: 'Menú del día', price: 20, available: true })
        expect(pack.slots).toHaveLength(3)
        expect(new Set(pack.slots.map(s => s.id)).size).toBe(3)
        expect(pack.slots[2]).toMatchObject({ category: 'bebida', excludedDishIds: ['cerveza'] })
        expect(await repo.findById(pack.id)).not.toBeNull()
    })

    it('rechaza datos inválidos', async () => {
        await expect(service.create({ restaurantId: 'r1', ...input(), price: 0 })).rejects.toThrow(InvalidPackError)
        await expect(service.create({ restaurantId: 'r1', ...input(), slots: [] })).rejects.toThrow(InvalidPackError)
    })

    it('lista los packs de un restaurante y, aparte, solo los disponibles', async () => {
        await service.create({ restaurantId: 'r1', ...input(), name: 'B' })
        await service.create({ restaurantId: 'r1', ...input(), name: 'A', available: false })
        await service.create({ restaurantId: 'r2', ...input(), name: 'C' })
        expect((await service.findByRestaurantId('r1')).map(p => p.name)).toEqual(['A', 'B'])
        expect((await service.findAvailableByRestaurantId('r1')).map(p => p.name)).toEqual(['B'])
    })

    it('obtiene un pack y falla si no existe o es de otro restaurante', async () => {
        const pack = await service.create({ restaurantId: 'r1', ...input() })
        expect((await service.findById('r1', pack.id)).id).toBe(pack.id)
        await expect(service.findById('r1', 'no-existe')).rejects.toThrow(PackNotFoundError)
        await expect(service.findById('r2', pack.id)).rejects.toThrow(PackNotFoundError)
    })

    it('actualiza un pack conservando su identificador y sustituyendo los huecos', async () => {
        const pack = await service.create({ restaurantId: 'r1', ...input() })
        const updated = await service.update('r1', pack.id, {
            name: 'Menú nuevo',
            price: 25,
            available: false,
            slots: [{ category: 'postre' }]
        })
        expect(updated).toMatchObject({ id: pack.id, name: 'Menú nuevo', price: 25, available: false, createdAt: pack.createdAt })
        expect(updated.slots).toHaveLength(1)
        expect(updated.slots[0]!.category).toBe('postre')
    })

    it('falla al actualizar un pack inexistente o con datos inválidos', async () => {
        const pack = await service.create({ restaurantId: 'r1', ...input() })
        await expect(service.update('r1', 'no-existe', input())).rejects.toThrow(PackNotFoundError)
        await expect(service.update('r1', pack.id, { ...input(), name: '' })).rejects.toThrow(InvalidPackError)
    })

    it('elimina un pack y falla si no existe', async () => {
        const pack = await service.create({ restaurantId: 'r1', ...input() })
        await service.delete('r1', pack.id)
        expect(await repo.findById(pack.id)).toBeNull()
        await expect(service.delete('r1', pack.id)).rejects.toThrow(PackNotFoundError)
    })
})
