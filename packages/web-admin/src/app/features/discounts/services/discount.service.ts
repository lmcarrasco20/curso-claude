import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../../../environments/environment'
import type { DiscountCode, DiscountDto } from '../models/discount.model'

@Injectable({ providedIn: 'root' })
export class DiscountService {
  private readonly http = inject(HttpClient)

  private buildUrl(restaurantId: string): string {
    return `${environment.apiUrl}/restaurants/${restaurantId}/discount-codes`
  }

  getAll(restaurantId: string) {
    return this.http.get<DiscountCode[]>(this.buildUrl(restaurantId))
  }

  getById(restaurantId: string, id: string) {
    return this.http.get<DiscountCode>(`${this.buildUrl(restaurantId)}/${id}`)
  }

  create(restaurantId: string, dto: DiscountDto) {
    return this.http.post<DiscountCode>(this.buildUrl(restaurantId), dto)
  }

  update(restaurantId: string, id: string, dto: DiscountDto) {
    return this.http.put<DiscountCode>(`${this.buildUrl(restaurantId)}/${id}`, dto)
  }

  delete(restaurantId: string, id: string) {
    return this.http.delete<void>(`${this.buildUrl(restaurantId)}/${id}`)
  }
}
