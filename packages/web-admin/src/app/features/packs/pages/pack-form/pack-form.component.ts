import { Component, ElementRef, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { PackStore } from '../../store/pack.store'
import { PackService } from '../../services/pack.service'
import { DishService } from '../../../dishes/services/dish.service'
import type { Dish } from '../../../dishes/models/dish.model'
import { PACK_CATEGORY_LABELS } from '../../models/pack.model'
import type { PackCategory, PackDto } from '../../models/pack.model'

interface SlotForm {
  category: PackCategory
  excludedDishIds: string[]
}

@Component({
  selector: 'app-pack-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './pack-form.component.html',
  styleUrl: './pack-form.component.css'
})
export class PackFormComponent implements OnInit {
  private readonly store = inject(PackStore)
  private readonly service = inject(PackService)
  private readonly dishService = inject(DishService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  isEditing = false
  packId: string | null = null
  restaurantId = ''

  readonly loading = signal(false)
  readonly error = signal<string | null>(null)
  readonly fieldErrors = signal<{ name?: string; price?: string; slots?: string }>({})
  readonly dishes = signal<Dish[]>([])
  readonly slots = signal<SlotForm[]>([{ category: 'entrante', excludedDishIds: [] }])
  readonly statusMessage = signal('')

  readonly categories = Object.entries(PACK_CATEGORY_LABELS).map(([value, label]) => ({ value: value as PackCategory, label }))

  form = { name: '', description: '' as string | null, price: 10, available: true }

  get pageTitle(): string {
    return this.isEditing ? 'Editar pack' : 'Nuevo pack'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/packs`
  }

  categoryLabel(category: PackCategory): string {
    return PACK_CATEGORY_LABELS[category]
  }

  dishesOf(category: PackCategory): Dish[] {
    return this.dishes().filter(d => d.category === category)
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (this.restaurantId) {
      this.loadDishes()
    }
    if (id && this.restaurantId) {
      this.isEditing = true
      this.packId = id
      this.loadPack()
    }
  }

  private async loadDishes(): Promise<void> {
    try {
      this.dishes.set(await firstValueFrom(this.dishService.getAll(this.restaurantId)))
    } catch {
      this.error.set('No se pudieron cargar los platos del restaurante.')
    }
  }

  private async loadPack(): Promise<void> {
    this.loading.set(true)
    try {
      const pack = await firstValueFrom(this.service.getById(this.restaurantId, this.packId!))
      this.form = { name: pack.name, description: pack.description, price: pack.price, available: pack.available }
      this.slots.set(pack.slots.map(s => ({ category: s.category, excludedDishIds: [...s.excludedDishIds] })))
    } catch {
      this.error.set('No se pudo cargar el pack.')
    } finally {
      this.loading.set(false)
    }
  }

  addSlot(): void {
    this.slots.update(list => [...list, { category: 'bebida', excludedDishIds: [] }])
    this.statusMessage.set(`Hueco ${this.slots().length} añadido`)
  }

  removeSlot(index: number): void {
    this.slots.update(list => list.filter((_, i) => i !== index))
    this.statusMessage.set(`Hueco ${index + 1} quitado`)
  }

  changeCategory(index: number, category: PackCategory): void {
    // Los platos bloqueados de otra categoría ya no tienen sentido
    this.slots.update(list => list.map((s, i) => (i === index ? { category, excludedDishIds: [] } : s)))
  }

  isExcluded(index: number, dishId: string): boolean {
    return this.slots()[index]?.excludedDishIds.includes(dishId) ?? false
  }

  toggleExcluded(index: number, dishId: string): void {
    this.slots.update(list => list.map((s, i) => {
      if (i !== index) return s
      const excluded = s.excludedDishIds.includes(dishId)
        ? s.excludedDishIds.filter(id => id !== dishId)
        : [...s.excludedDishIds, dishId]
      return { ...s, excludedDishIds: excluded }
    }))
  }

  private validate(): boolean {
    const errors: { name?: string; price?: string; slots?: string } = {}
    if (!this.form.name?.trim()) errors.name = 'El nombre del pack es obligatorio.'
    if (!Number.isFinite(this.form.price) || this.form.price <= 0) errors.price = 'Introduce un precio mayor que 0.'
    if (this.slots().length === 0) errors.slots = 'El pack debe tener al menos un hueco.'
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

    this.loading.set(true)
    try {
      const dto: PackDto = {
        name: this.form.name.trim(),
        description: this.form.description?.trim() || null,
        price: this.form.price,
        available: this.form.available,
        slots: this.slots().map(s => ({ category: s.category, excludedDishIds: s.excludedDishIds }))
      }
      if (this.isEditing && this.packId) {
        await this.store.update(this.restaurantId, this.packId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'packs'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar el pack.')
      this.focusFirst('#form-error')
    } finally {
      this.loading.set(false)
    }
  }
}
