import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core'
import { AuthStore } from '@resttek/web-shared'
import { OrderStore } from '../../../orders/store/order.store'
import { TableStore } from '../../store/table.store'
import type { RestaurantTable, TableStatus } from '../../models/table.model'

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore)
  readonly tableStore = inject(TableStore)
  readonly orderStore = inject(OrderStore)

  readonly statuses: { value: TableStatus; label: string }[] = [
    { value: 'libre', label: 'Libre' },
    { value: 'ocupada', label: 'Ocupada' },
    { value: 'reservada', label: 'Reservada' }
  ]

  /** Pedidos activos agrupados por el id de su mesa */
  readonly ordersByTable = computed(() => {
    const map = new Map<string, ReturnType<OrderStore['orders']>>()
    for (const order of this.orderStore.orders()) {
      if (!order.tableId) continue
      map.set(order.tableId, [...(map.get(order.tableId) ?? []), order])
    }
    return map
  })

  private get restaurantId(): string | null {
    return this.authStore.user()?.restaurantId ?? null
  }

  ngOnInit(): void {
    const restaurantId = this.restaurantId
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId)
      this.orderStore.startPolling(restaurantId)
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling()
    this.orderStore.stopPolling()
  }

  ordersOf(table: RestaurantTable) {
    return this.ordersByTable().get(table.id) ?? []
  }

  onStatusChange(table: RestaurantTable, event: Event): void {
    const restaurantId = this.restaurantId
    if (!restaurantId) return
    const status = (event.target as HTMLSelectElement).value as TableStatus
    this.tableStore.changeStatus(restaurantId, table.id, status)
  }

  getItemStatusClass(status: string): string {
    return `badge badge-${status}`
  }
}
