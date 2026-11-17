import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { PointsRewardService } from '../services/points-reward.service'
import type { PointsReward, PointsRewardDto } from '../models/points-reward.model'

@Injectable({ providedIn: 'root' })
export class PointsRewardStore {
  private readonly service = inject(PointsRewardService)

  private readonly _rewards = signal<PointsReward[]>([])
  private readonly _loading = signal(false)
  private readonly _error = signal<string | null>(null)

  readonly rewards = this._rewards.asReadonly()
  readonly loading = this._loading.asReadonly()
  readonly error = this._error.asReadonly()

  async loadByRestaurant(restaurantId: string): Promise<void> {
    this._loading.set(true)
    this._error.set(null)
    try {
      this._rewards.set(await firstValueFrom(this.service.getAll(restaurantId)))
    } catch {
      this._error.set('No se pudieron cargar las equivalencias de puntos.')
    } finally {
      this._loading.set(false)
    }
  }

  async create(restaurantId: string, dto: PointsRewardDto): Promise<void> {
    const reward = await firstValueFrom(this.service.create(restaurantId, dto))
    this._rewards.update(list => [...list, reward].sort((a, b) => a.points - b.points))
  }

  async update(restaurantId: string, id: string, dto: PointsRewardDto): Promise<void> {
    const updated = await firstValueFrom(this.service.update(restaurantId, id, dto))
    this._rewards.update(list => list.map(r => r.id === id ? updated : r).sort((a, b) => a.points - b.points))
  }

  async delete(restaurantId: string, id: string): Promise<void> {
    await firstValueFrom(this.service.delete(restaurantId, id))
    this._rewards.update(list => list.filter(r => r.id !== id))
  }
}
