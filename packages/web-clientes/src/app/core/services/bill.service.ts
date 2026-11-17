import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { Bill, BillRequest, PointsBalance, PointsReward } from '../models/bill.model'

@Injectable({ providedIn: 'root' })
export class BillService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  /** Cuenta ya pedida de un pedido (404 si todavía no se ha pedido) */
  getBill(orderId: string): Observable<Bill> {
    return this.http.get<Bill>(`${this.apiUrl}/orders/${orderId}/bill`)
  }

  requestBill(orderId: string, request: BillRequest): Observable<Bill> {
    return this.http.post<Bill>(`${this.apiUrl}/orders/${orderId}/bill`, request)
  }

  getRewards(restaurantId: string): Observable<PointsReward[]> {
    return this.http.get<PointsReward[]>(`${this.apiUrl}/restaurants/${restaurantId}/points-rewards`)
  }

  getBalance(restaurantId: string): Observable<PointsBalance> {
    const params = new HttpParams().set('restaurantId', restaurantId)
    return this.http.get<PointsBalance>(`${this.apiUrl}/points/mine`, { params })
  }
}
