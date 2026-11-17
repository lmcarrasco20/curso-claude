import type { Request, Response, NextFunction } from 'express'
import type { PackService } from '@services/pack.service.js'
import type { Pack } from '@models/pack.model.js'

export class PackController {
    constructor(private readonly packService: PackService) {}

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pack = await this.packService.create({
                restaurantId: req.params.restaurantId as string,
                name: req.body.name,
                description: req.body.description,
                price: req.body.price,
                available: req.body.available,
                slots: req.body.slots
            })
            res.status(201).json(this.toJSON(pack))
        } catch (error) {
            next(error)
        }
    }

    getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const packs = await this.packService.findByRestaurantId(req.params.restaurantId as string)
            res.status(200).json(packs.map(p => this.toJSON(p)))
        } catch (error) {
            next(error)
        }
    }

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pack = await this.packService.findById(req.params.restaurantId as string, req.params.id as string)
            res.status(200).json(this.toJSON(pack))
        } catch (error) {
            next(error)
        }
    }

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pack = await this.packService.update(req.params.restaurantId as string, req.params.id as string, {
                name: req.body.name,
                description: req.body.description,
                price: req.body.price,
                available: req.body.available,
                slots: req.body.slots
            })
            res.status(200).json(this.toJSON(pack))
        } catch (error) {
            next(error)
        }
    }

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.packService.delete(req.params.restaurantId as string, req.params.id as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    getPublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const packs = await this.packService.findAvailableByRestaurantId(req.params.restaurantId as string)
            res.status(200).json(packs.map(p => this.toJSON(p)))
        } catch (error) {
            next(error)
        }
    }

    private toJSON(pack: Pack) {
        return {
            id: pack.id,
            restaurantId: pack.restaurantId,
            name: pack.name,
            description: pack.description,
            price: pack.price,
            available: pack.available,
            slots: pack.slots.map(slot => ({ id: slot.id, category: slot.category, excludedDishIds: slot.excludedDishIds })),
            createdAt: pack.createdAt,
            updatedAt: pack.updatedAt
        }
    }
}
