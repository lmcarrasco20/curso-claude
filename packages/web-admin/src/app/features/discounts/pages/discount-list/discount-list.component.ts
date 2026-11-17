import { Component, DestroyRef, inject, OnInit } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { DecimalPipe } from '@angular/common'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { DiscountStore } from '../../store/discount.store'
import type { DiscountCode } from '../../models/discount.model'

@Component({
  selector: 'app-discount-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, DecimalPipe],
  templateUrl: './discount-list.component.html',
  styleUrl: './discount-list.component.css'
})
export class DiscountListComponent implements OnInit {
  readonly store = inject(DiscountStore)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)
  restaurantId = ''

  ngOnInit(): void {
    // El componente se reutiliza al cambiar de restaurante, así que hay que escuchar el parámetro
    this.route.parent?.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.restaurantId = params.get('restaurantId') ?? ''
      if (this.restaurantId) {
        this.store.loadByRestaurant(this.restaurantId)
      }
    })
  }

  async onDelete(discount: DiscountCode): Promise<void> {
    if (!this.restaurantId) return
    if (confirm(`¿Estás seguro de eliminar el código ${discount.code}?`)) {
      try {
        await this.store.delete(this.restaurantId, discount.id)
      } catch {
        alert('Error al eliminar el código de descuento.')
      }
    }
  }
}
