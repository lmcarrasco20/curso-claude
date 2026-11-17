import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { RestaurantTable } from '../models/table.model'

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  /** Mesas libres con capacidad para el número de personas indicado */
  getAvailable(restaurantId: string, people: number): Observable<RestaurantTable[]> {
    const params = new HttpParams().set('people', people)
    return this.http.get<RestaurantTable[]>(`${this.apiUrl}/public/restaurants/${restaurantId}/tables`, { params })
  }

  /** Marca la mesa como ocupada. Falla con 409 si otro cliente la ocupó antes. */
  occupy(restaurantId: string, tableId: string): Observable<RestaurantTable> {
    return this.http.post<RestaurantTable>(`${this.apiUrl}/restaurants/${restaurantId}/tables/${tableId}/occupy`, {})
  }
}
