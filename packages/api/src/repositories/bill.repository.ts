import { Database } from '@config/database.js'
import type { Bill } from '@models/bill.model.js'

interface BillRow {
    id: string
    orderId: string
    clientId: string
    restaurantId: string
    discountCode: string | null
    subtotal: number
    codeDiscount: number
    pointsUsed: number
    pointsDiscount: number
    total: number
    createdAt: string
}

export interface BillRepository {
    findByOrderId(orderId: string): Promise<Bill | null>
    /** Guarda la cuenta. Devuelve false si ese pedido ya tenía cuenta. */
    save(bill: Bill): Promise<boolean>
}

export class SqliteBillRepository implements BillRepository {
    constructor(private readonly db: Database) {}

    async findByOrderId(orderId: string): Promise<Bill | null> {
        const row = await this.db.get<BillRow>(
            `SELECT id, order_id as orderId, client_id as clientId, restaurant_id as restaurantId, discount_code as discountCode,
                    subtotal, code_discount as codeDiscount, points_used as pointsUsed, points_discount as pointsDiscount,
                    total, created_at as createdAt
             FROM bills WHERE order_id = ?`,
            [orderId]
        )
        return row ?? null
    }

    async save(bill: Bill): Promise<boolean> {
        const result = await this.db.run(
            `INSERT OR IGNORE INTO bills
                (id, order_id, client_id, restaurant_id, discount_code, subtotal, code_discount, points_used, points_discount, total, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [bill.id, bill.orderId, bill.clientId, bill.restaurantId, bill.discountCode, bill.subtotal, bill.codeDiscount,
             bill.pointsUsed, bill.pointsDiscount, bill.total, bill.createdAt]
        )
        return result.changes > 0
    }
}
