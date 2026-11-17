import { Component, ElementRef, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { DiscountStore } from '../../store/discount.store'
import { DiscountService } from '../../services/discount.service'
import type { DiscountDto, DiscountType } from '../../models/discount.model'

@Component({
  selector: 'app-discount-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './discount-form.component.html',
  styleUrl: './discount-form.component.css'
})
export class DiscountFormComponent implements OnInit {
  private readonly store = inject(DiscountStore)
  private readonly service = inject(DiscountService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  isEditing = false
  discountId: string | null = null
  restaurantId = ''
  loading = signal(false)
  error = signal<string | null>(null)
  fieldErrors = signal<{ code?: string; value?: string }>({})

  types: { value: DiscountType; label: string }[] = [
    { value: 'porcentaje', label: 'Porcentaje (%)' },
    { value: 'importe', label: 'Importe fijo (€)' }
  ]

  form: DiscountDto = {
    code: '',
    type: 'porcentaje',
    value: 10,
    active: true
  }

  get pageTitle(): string {
    return this.isEditing ? 'Editar código de descuento' : 'Nuevo código de descuento'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/discounts`
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (id && this.restaurantId) {
      this.isEditing = true
      this.discountId = id
      this.loadDiscount()
    }
  }

  private async loadDiscount(): Promise<void> {
    this.loading.set(true)
    try {
      const discount = await firstValueFrom(this.service.getById(this.restaurantId, this.discountId!))
      this.form = { code: discount.code, type: discount.type, value: discount.value, active: discount.active }
    } catch {
      this.error.set('No se pudo cargar el código de descuento.')
    } finally {
      this.loading.set(false)
    }
  }

  private validate(): boolean {
    const errors: { code?: string; value?: string } = {}
    const code = this.form.code?.trim() ?? ''
    if (code === '') {
      errors.code = 'El código es obligatorio.'
    } else if (/\s/.test(code)) {
      errors.code = 'El código no puede contener espacios.'
    }
    if (!Number.isFinite(this.form.value) || this.form.value <= 0) {
      errors.value = 'Introduce un valor mayor que 0.'
    } else if (this.form.type === 'porcentaje' && this.form.value > 100) {
      errors.value = 'El porcentaje no puede ser mayor que 100.'
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

    this.loading.set(true)
    try {
      const dto: DiscountDto = { ...this.form, code: this.form.code.trim() }
      if (this.isEditing && this.discountId) {
        await this.store.update(this.restaurantId, this.discountId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'discounts'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar el código de descuento.')
      this.focusFirst('#form-error')
    } finally {
      this.loading.set(false)
    }
  }
}
