import type { BillRepository } from '@repositories/bill.repository.js'
import type { Bill } from '@models/bill.model.js'

export class MockBillRepository implements BillRepository {
    bills: Bill[] = []

    async findByOrderId(orderId: string): Promise<Bill | null> {
        return this.bills.find(b => b.orderId === orderId) ?? null
    }

    async save(bill: Bill): Promise<boolean> {
        if (this.bills.some(b => b.orderId === bill.orderId)) return false
        this.bills.push({ ...bill })
        return true
    }
}
