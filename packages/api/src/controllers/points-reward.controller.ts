import type { Request, Response, NextFunction } from 'express'
import type { PointsRewardService } from '@services/points-reward.service.js'

export class PointsRewardController {
    constructor(private readonly pointsRewardService: PointsRewardService) {}

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const reward = await this.pointsRewardService.create({
                restaurantId: req.params.restaurantId as string,
                points: Number(req.body.points),
                discount: Number(req.body.discount)
            })
            res.status(201).json(reward)
        } catch (error) {
            next(error)
        }
    }

    getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rewards = await this.pointsRewardService.findByRestaurantId(req.params.restaurantId as string)
            res.status(200).json(rewards)
        } catch (error) {
            next(error)
        }
    }

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const reward = await this.pointsRewardService.update(req.params.restaurantId as string, req.params.id as string, {
                points: Number(req.body.points),
                discount: Number(req.body.discount)
            })
            res.status(200).json(reward)
        } catch (error) {
            next(error)
        }
    }

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.pointsRewardService.delete(req.params.restaurantId as string, req.params.id as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }
}
