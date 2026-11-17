import { Component, ElementRef, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'
import type { TableDto, TableStatus } from '../../models/table.model'

@Component({
  selector: 'app-table-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './table-form.component.html',
  styleUrl: './table-form.component.css'
})
export class TableFormComponent implements OnInit {
  private readonly store = inject(TableStore)
  private readonly service = inject(TableService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  isEditing = false
  tableId: string | null = null
  restaurantId = ''
  loading = signal(false)
  error = signal<string | null>(null)
  fieldErrors = signal<{ number?: string; capacity?: string }>({})

  statuses: { value: TableStatus; label: string }[] = [
    { value: 'libre', label: 'Libre' },
    { value: 'ocupada', label: 'Ocupada' },
    { value: 'reservada', label: 'Reservada' }
  ]

  form: TableDto = {
    number: 1,
    description: null,
    capacity: 2,
    status: 'libre'
  }

  get pageTitle(): string {
    return this.isEditing ? 'Editar mesa' : 'Nueva mesa'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/tables`
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (id && this.restaurantId) {
      this.isEditing = true
      this.tableId = id
      this.loadTable()
    }
  }

  private async loadTable(): Promise<void> {
    this.loading.set(true)
    try {
      const table = await firstValueFrom(this.service.getById(this.restaurantId, this.tableId!))
      this.form = {
        number: table.number,
        description: table.description,
        capacity: table.capacity,
        status: table.status
      }
    } catch {
      this.error.set('No se pudo cargar la mesa.')
    } finally {
      this.loading.set(false)
    }
  }

  private validate(): boolean {
    const errors: { number?: string; capacity?: string } = {}
    if (!Number.isInteger(this.form.number) || this.form.number <= 0) {
      errors.number = 'Introduce un número de mesa entero mayor que 0.'
    }
    if (!Number.isInteger(this.form.capacity) || this.form.capacity <= 0) {
      errors.capacity = 'Introduce una capacidad entera mayor que 0.'
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
      const dto: TableDto = { ...this.form, description: this.form.description?.trim() || null }
      if (this.isEditing && this.tableId) {
        await this.store.update(this.restaurantId, this.tableId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'tables'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar la mesa.')
      this.focusFirst('#form-error')
    } finally {
      this.loading.set(false)
    }
  }
}
