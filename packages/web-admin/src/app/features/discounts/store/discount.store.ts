import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { DiscountService } from '../services/discount.service'
import type { DiscountCode, DiscountDto } from '../models/discount.model'

@Injectable({ providedIn: 'root' })
export class DiscountStore {
  private readonly service = inject(DiscountService)

  private readonly _discounts = signal<DiscountCode[]>([])
  private readonly _loading = signal(false)
  private readonly _error = signal<string | null>(null)

  readonly discounts = this._discounts.asReadonly()
  readonly loading = this._loading.asReadonly()
  readonly error = this._error.asReadonly()

  async loadByRestaurant(restaurantId: string): Promise<void> {
    this._loading.set(true)
    this._error.set(null)
    try {
      this._discounts.set(await firstValueFrom(this.service.getAll(restaurantId)))
    } catch {
      this._error.set('No se pudieron cargar los códigos de descuento.')
    } finally {
      this._loading.set(false)
    }
  }

  async create(restaurantId: string, dto: DiscountDto): Promise<void> {
    const discount = await firstValueFrom(this.service.create(restaurantId, dto))
    this._discounts.update(list => [...list, discount].sort((a, b) => a.code.localeCompare(b.code)))
  }

  async update(restaurantId: string, id: string, dto: DiscountDto): Promise<void> {
    const updated = await firstValueFrom(this.service.update(restaurantId, id, dto))
    this._discounts.update(list => list.map(d => d.id === id ? updated : d).sort((a, b) => a.code.localeCompare(b.code)))
  }

  async delete(restaurantId: string, id: string): Promise<void> {
    await firstValueFrom(this.service.delete(restaurantId, id))
    this._discounts.update(list => list.filter(d => d.id !== id))
  }
}
