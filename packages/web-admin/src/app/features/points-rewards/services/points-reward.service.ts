import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../../../environments/environment'
import type { PointsReward, PointsRewardDto } from '../models/points-reward.model'

@Injectable({ providedIn: 'root' })
export class PointsRewardService {
  private readonly http = inject(HttpClient)

  private buildUrl(restaurantId: string): string {
    return `${environment.apiUrl}/restaurants/${restaurantId}/points-rewards`
  }

  getAll(restaurantId: string) {
    return this.http.get<PointsReward[]>(this.buildUrl(restaurantId))
  }

  create(restaurantId: string, dto: PointsRewardDto) {
    return this.http.post<PointsReward>(this.buildUrl(restaurantId), dto)
  }

  update(restaurantId: string, id: string, dto: PointsRewardDto) {
    return this.http.put<PointsReward>(`${this.buildUrl(restaurantId)}/${id}`, dto)
  }

  delete(restaurantId: string, id: string) {
    return this.http.delete<void>(`${this.buildUrl(restaurantId)}/${id}`)
  }
}
