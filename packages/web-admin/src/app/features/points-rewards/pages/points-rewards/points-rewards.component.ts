import { Component, DestroyRef, ElementRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { DecimalPipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { PointsRewardStore } from '../../store/points-reward.store'
import type { PointsReward } from '../../models/points-reward.model'

@Component({
  selector: 'app-points-rewards',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, DecimalPipe],
  templateUrl: './points-rewards.component.html',
  styleUrl: './points-rewards.component.css'
})
export class PointsRewardsComponent implements OnInit {
  readonly store = inject(PointsRewardStore)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  restaurantId = ''
  editingId: string | null = null
  form = { points: 10, discount: 1 }

  readonly saving = signal(false)
  readonly error = signal<string | null>(null)
  readonly fieldErrors = signal<{ points?: string; discount?: string }>({})

  ngOnInit(): void {
    // El componente se reutiliza al cambiar de restaurante, así que hay que escuchar el parámetro
    this.route.parent?.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.restaurantId = params.get('restaurantId') ?? ''
      this.resetForm()
      if (this.restaurantId) {
        this.store.loadByRestaurant(this.restaurantId)
      }
    })
  }

  startEdit(reward: PointsReward): void {
    this.editingId = reward.id
    this.form = { points: reward.points, discount: reward.discount }
    this.error.set(null)
    this.fieldErrors.set({})
    this.focusFirst('#reward-points')
  }

  resetForm(): void {
    this.editingId = null
    this.form = { points: 10, discount: 1 }
    this.error.set(null)
    this.fieldErrors.set({})
  }

  private validate(): boolean {
    const errors: { points?: string; discount?: string } = {}
    if (!Number.isInteger(this.form.points) || this.form.points <= 0) {
      errors.points = 'Introduce una cantidad de puntos entera mayor que 0.'
    }
    if (!Number.isFinite(this.form.discount) || this.form.discount <= 0) {
      errors.discount = 'Introduce un descuento mayor que 0.'
    }
    this.fieldErrors.set(errors)
    return Object.keys(errors).length === 0
  }

  private focusFirst(selector: string): void {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus())
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    if (!this.validate()) {
      this.focusFirst('[aria-invalid="true"]')
      return
    }

    this.saving.set(true)
    try {
      if (this.editingId) {
        await this.store.update(this.restaurantId, this.editingId, this.form)
      } else {
        await this.store.create(this.restaurantId, this.form)
      }
      this.resetForm()
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar la equivalencia.')
      this.focusFirst('#form-error')
    } finally {
      this.saving.set(false)
    }
  }

  async onDelete(reward: PointsReward): Promise<void> {
    if (!this.restaurantId) return
    if (confirm(`¿Estás seguro de eliminar la equivalencia de ${reward.points} puntos?`)) {
      try {
        await this.store.delete(this.restaurantId, reward.id)
        if (this.editingId === reward.id) this.resetForm()
      } catch {
        alert('Error al eliminar la equivalencia.')
      }
    }
  }
}
