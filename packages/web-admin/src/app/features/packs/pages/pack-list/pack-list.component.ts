import { Component, DestroyRef, inject, OnInit } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { DecimalPipe } from '@angular/common'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { PackStore } from '../../store/pack.store'
import { PACK_CATEGORY_LABELS } from '../../models/pack.model'
import type { Pack } from '../../models/pack.model'

@Component({
  selector: 'app-pack-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, DecimalPipe],
  templateUrl: './pack-list.component.html',
  styleUrl: './pack-list.component.css'
})
export class PackListComponent implements OnInit {
  readonly store = inject(PackStore)
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

  composition(pack: Pack): string {
    return pack.slots.map(slot => PACK_CATEGORY_LABELS[slot.category]).join(' + ')
  }

  blockedCount(pack: Pack): number {
    return pack.slots.reduce((total, slot) => total + slot.excludedDishIds.length, 0)
  }

  async onDelete(pack: Pack): Promise<void> {
    if (!this.restaurantId) return
    if (confirm(`¿Estás seguro de eliminar el pack ${pack.name}?`)) {
      try {
        await this.store.delete(this.restaurantId, pack.id)
      } catch {
        alert('Error al eliminar el pack.')
      }
    }
  }
}
