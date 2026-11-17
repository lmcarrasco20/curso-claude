import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { DuplicatedTableNumberError, InvalidTableError, InvalidTableStatusError, TableNotAvailableError, TableNotFoundError } from '@errors/DomainErrors.js'

describe('TableService - CRUD', () => {
    let repo: MockTableRepository
    let service: TableService

    beforeEach(() => {
        repo = new MockTableRepository()
        service = new TableService(repo)
    })

    it('crea una mesa libre con los datos limpios', async () => {
        const table = await service.create({ restaurantId: 'r1', number: 1, description: ' Terraza ', capacity: 4 })
        expect(table).toMatchObject({ restaurantId: 'r1', number: 1, description: 'Terraza', capacity: 4, status: 'libre' })
        expect(table.id).toBeTruthy()
        expect(await repo.findById(table.id)).not.toBeNull()
    })

    it('rechaza datos inválidos', async () => {
        await expect(service.create({ restaurantId: 'r1', number: 0, capacity: 4 })).rejects.toThrow(InvalidTableError)
    })

    it('rechaza un número repetido en el mismo restaurante pero lo permite en otro', async () => {
        await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
        await expect(service.create({ restaurantId: 'r1', number: 1, capacity: 6 })).rejects.toThrow(DuplicatedTableNumberError)
        await expect(service.create({ restaurantId: 'r2', number: 1, capacity: 6 })).resolves.toBeDefined()
    })

    it('lista las mesas del restaurante', async () => {
        await service.create({ restaurantId: 'r1', number: 2, capacity: 2 })
        await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
        await service.create({ restaurantId: 'r2', number: 1, capacity: 2 })
        const tables = await service.findByRestaurantId('r1')
        expect(tables.map(t => t.number)).toEqual([1, 2])
    })

    it('obtiene una mesa y falla si no existe o es de otro restaurante', async () => {
        const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
        expect((await service.findById('r1', table.id)).id).toBe(table.id)
        await expect(service.findById('r1', 'no-existe')).rejects.toThrow(TableNotFoundError)
        await expect(service.findById('r2', table.id)).rejects.toThrow(TableNotFoundError)
    })

    it('actualiza una mesa conservando su identificador y su estado si no se indica', async () => {
        const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
        await repo.updateStatus(table.id, 'ocupada', new Date().toISOString())
        const updated = await service.update('r1', table.id, { number: 5, description: 'Barra', capacity: 3 })
        expect(updated).toMatchObject({ id: table.id, number: 5, description: 'Barra', capacity: 3, status: 'ocupada' })
    })

    it('permite cambiar el estado al actualizar', async () => {
        const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
        const updated = await service.update('r1', table.id, { number: 1, capacity: 2, status: 'reservada' })
        expect(updated.status).toBe('reservada')
    })

    it('no permite actualizar al número de otra mesa, pero sí conservar el propio', async () => {
        const a = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
        await service.create({ restaurantId: 'r1', number: 2, capacity: 2 })
        await expect(service.update('r1', a.id, { number: 2, capacity: 2 })).rejects.toThrow(DuplicatedTableNumberError)
        await expect(service.update('r1', a.id, { number: 1, capacity: 8 })).resolves.toMatchObject({ capacity: 8 })
    })

    it('falla al actualizar una mesa inexistente', async () => {
        await expect(service.update('r1', 'no-existe', { number: 1, capacity: 2 })).rejects.toThrow(TableNotFoundError)
    })

    it('elimina una mesa y falla si no existe', async () => {
        const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
        await service.delete('r1', table.id)
        expect(await repo.findById(table.id)).toBeNull()
        await expect(service.delete('r1', table.id)).rejects.toThrow(TableNotFoundError)
    })
})

describe('TableService - estados y ocupación', () => {
    let repo: MockTableRepository
    let service: TableService

    beforeEach(() => {
        repo = new MockTableRepository()
        service = new TableService(repo)
    })

    it('cambia el estado de una mesa', async () => {
        const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
        const updated = await service.changeStatus('r1', table.id, 'Reservada')
        expect(updated.status).toBe('reservada')
        expect((await repo.findById(table.id))?.status).toBe('reservada')
    })

    it('rechaza un estado inválido y una mesa de otro restaurante', async () => {
        const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
        await expect(service.changeStatus('r1', table.id, 'rota')).rejects.toThrow(InvalidTableStatusError)
        await expect(service.changeStatus('r2', table.id, 'libre')).rejects.toThrow(TableNotFoundError)
    })

    it('lista solo las mesas libres con capacidad suficiente, de menor a mayor capacidad', async () => {
        const grande = await service.create({ restaurantId: 'r1', number: 1, capacity: 8 })
        await service.create({ restaurantId: 'r1', number: 2, capacity: 2 })
        const media = await service.create({ restaurantId: 'r1', number: 3, capacity: 4 })
        const ocupada = await service.create({ restaurantId: 'r1', number: 4, capacity: 4 })
        await service.changeStatus('r1', ocupada.id, 'ocupada')
        await service.create({ restaurantId: 'r2', number: 1, capacity: 4 })

        const available = await service.findAvailable('r1', 3)
        expect(available.map(t => t.id)).toEqual([media.id, grande.id])
    })

    it('exige un número de comensales válido', async () => {
        await expect(service.findAvailable('r1', 0)).rejects.toThrow(InvalidTableError)
        await expect(service.findAvailable('r1', 1.5)).rejects.toThrow(InvalidTableError)
    })

    it('ocupa una mesa libre', async () => {
        const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
        const occupied = await service.occupy('r1', table.id)
        expect(occupied.status).toBe('ocupada')
        expect((await repo.findById(table.id))?.status).toBe('ocupada')
    })

    it.each(['ocupada', 'reservada'])('no permite ocupar una mesa %s', async status => {
        const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
        await service.changeStatus('r1', table.id, status)
        await expect(service.occupy('r1', table.id)).rejects.toThrow(TableNotAvailableError)
    })

    it('si dos clientes ocupan la misma mesa a la vez, solo uno lo consigue', async () => {
        const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
        const results = await Promise.allSettled([service.occupy('r1', table.id), service.occupy('r1', table.id)])
        expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
        expect(results.filter(r => r.status === 'rejected')).toHaveLength(1)
    })
})
