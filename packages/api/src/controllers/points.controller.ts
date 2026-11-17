import type { Request, Response, NextFunction } from 'express'
import type { PointsService } from '@services/points.service.js'

export class PointsController {
    constructor(private readonly pointsService: PointsService) {}

    getRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rule = await this.pointsService.getRule(req.params.restaurantId as string)
            res.status(200).json(rule)
        } catch (error) {
            next(error)
        }
    }

    setRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rule = await this.pointsService.setRule(
                req.params.restaurantId as string,
                Number(req.body.eurosPerBlock),
                Number(req.body.pointsPerBlock)
            )
            res.status(200).json(rule)
        } catch (error) {
            next(error)
        }
    }

    getMyBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = (req as any).user
            const restaurantId = req.query.restaurantId
            if (!restaurantId || typeof restaurantId !== 'string') {
                res.status(400).json({ error: 'restaurantId is required' })
                return
            }
            const points = await this.pointsService.getBalance(user.id, restaurantId)
            res.status(200).json({ restaurantId, points })
        } catch (error) {
            next(error)
        }
    }
}
