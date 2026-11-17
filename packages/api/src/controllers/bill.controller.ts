import type { Request, Response, NextFunction } from 'express'
import type { BillService } from '@services/bill.service.js'

export class BillController {
    constructor(private readonly billService: BillService) {}

    requestBill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = (req as any).user
            const bill = await this.billService.requestBill({
                orderId: req.params.id as string,
                clientId: user.id,
                discountCode: req.body?.discountCode ?? null,
                pointsRewardId: req.body?.pointsRewardId ?? null
            })
            res.status(201).json(bill)
        } catch (error) {
            next(error)
        }
    }

    getBill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = (req as any).user
            const bill = await this.billService.getByOrder(req.params.id as string, user.id)
            res.status(200).json(bill)
        } catch (error) {
            next(error)
        }
    }
}
