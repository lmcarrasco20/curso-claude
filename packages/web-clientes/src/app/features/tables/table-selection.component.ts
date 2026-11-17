import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { RestaurantService } from '../../core/services/restaurant.service'
import { TableService } from '../../core/services/table.service'
import { CartStore } from '../../core/store/cart.store'
import { Restaurant } from '../../core/models/restaurant.model'
import { RestaurantTable } from '../../core/models/table.model'

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container">
      <div class="page-header">
        <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
        <h1>{{ restaurant()?.name || 'Cargando...' }}</h1>
        <p>Elige tu mesa antes de ver la carta</p>
      </div>

      <form class="card people-form" (ngSubmit)="search()" novalidate>
        <div class="form-group">
          <label for="people">¿Cuántas personas sois?</label>
          <input
            id="people"
            name="people"
            type="number"
            class="form-control"
            min="1"
            step="1"
            [(ngModel)]="people"
            [attr.aria-invalid]="peopleError() ? 'true' : null"
            [attr.aria-describedby]="peopleError() ? 'people-error' : null"
          />
          @if (peopleError()) {
            <span class="field-error" id="people-error">{{ peopleError() }}</span>
          }
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="searching()">Buscar mesas</button>
      </form>

      @if (notice()) {
        <div class="alert-error" role="alert">{{ notice() }}</div>
      }

      @if (searching()) {
        <div class="spinner" role="status" aria-label="Buscando mesas"></div>
      } @else if (error()) {
        <div class="alert-error" role="alert">{{ error() }}</div>
      } @else if (searched()) {
        @if (tables().length === 0) {
          <div class="empty-state card" role="status">
            <p>No hay mesas libres para {{ searchedPeople() }} {{ searchedPeople() === 1 ? 'persona' : 'personas' }} ahora mismo.</p>
          </div>
        } @else {
          <form (ngSubmit)="continue()" novalidate>
            <fieldset class="tables-fieldset">
              <legend>Mesas disponibles para {{ searchedPeople() }} {{ searchedPeople() === 1 ? 'persona' : 'personas' }}</legend>
              <div class="tables-grid">
                @for (table of tables(); track table.id) {
                  <label class="table-option card" [class.selected]="selectedTableId() === table.id">
                    <input
                      type="radio"
                      name="table"
                      [value]="table.id"
                      [checked]="selectedTableId() === table.id"
                      (change)="selectedTableId.set(table.id)"
                    />
                    <span class="table-number">Mesa {{ table.number }}</span>
                    <span class="table-meta">{{ table.capacity }} personas</span>
                    @if (table.description) {
                      <span class="table-meta">{{ table.description }}</span>
                    }
                  </label>
                }
              </div>
            </fieldset>
            <button type="submit" class="btn btn-primary continue-btn" [disabled]="!selectedTableId() || occupying()">Continuar</button>
          </form>
        }
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .back-link {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 8px;
      display: inline-block;
    }
    .people-form {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      margin: 24px 0;
    }
    .people-form .form-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field-error {
      color: #fca5a5;
      font-size: 13px;
    }
    .tables-fieldset {
      border: 0;
      margin-bottom: 16px;
    }
    .tables-fieldset legend {
      font-weight: 600;
      margin-bottom: 12px;
    }
    .tables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }
    .table-option {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px;
      cursor: pointer;
      position: relative;
    }
    .table-option.selected {
      border-color: var(--green-medium);
    }
    .table-option input {
      position: absolute;
      top: 12px;
      right: 12px;
    }
    .table-number {
      font-size: 18px;
      font-weight: 600;
    }
    .table-meta {
      color: var(--text-secondary);
      font-size: 13px;
    }
    .continue-btn {
      width: 100%;
      justify-content: center;
    }
    a:focus-visible,
    button:focus-visible,
    input:focus-visible {
      outline: 3px solid var(--yellow);
      outline-offset: 2px;
    }
  `]
})
export class TableSelectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly restaurantService = inject(RestaurantService)
  private readonly tableService = inject(TableService)
  private readonly cartStore = inject(CartStore)

  restaurantId = ''
  people = 2

  readonly restaurant = signal<Restaurant | null>(null)
  readonly tables = signal<RestaurantTable[]>([])
  readonly selectedTableId = signal<string | null>(null)
  readonly searching = signal(false)
  readonly occupying = signal(false)
  readonly searched = signal(false)
  readonly searchedPeople = signal(0)
  readonly error = signal<string | null>(null)
  /** Aviso que se muestra junto a la lista de mesas (por ejemplo, si la mesa elegida ya no está libre) */
  readonly notice = signal<string | null>(null)
  readonly peopleError = signal<string | null>(null)

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id') ?? ''
    this.restaurantService.getById(this.restaurantId).subscribe({
      next: restaurant => this.restaurant.set(restaurant),
      error: () => this.error.set('No se pudo cargar el restaurante.')
    })
  }

  search(): void {
    this.peopleError.set(null)
    this.error.set(null)
    if (!Number.isInteger(this.people) || this.people < 1) {
      this.peopleError.set('Indica un número de personas entero mayor que 0.')
      return
    }

    this.searching.set(true)
    this.selectedTableId.set(null)
    this.tableService.getAvailable(this.restaurantId, this.people).subscribe({
      next: tables => {
        this.tables.set(tables)
        this.searchedPeople.set(this.people)
        this.searched.set(true)
        this.searching.set(false)
      },
      error: () => {
        this.error.set('No se pudieron cargar las mesas disponibles.')
        this.searching.set(false)
      }
    })
  }

  continue(): void {
    const tableId = this.selectedTableId()
    if (!tableId || this.occupying()) return

    this.occupying.set(true)
    this.notice.set(null)
    this.tableService.occupy(this.restaurantId, tableId).subscribe({
      next: table => {
        this.cartStore.setTable({ id: table.id, number: table.number, restaurantId: this.restaurantId })
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: err => {
        this.occupying.set(false)
        if (err?.status === 409) {
          this.search()
          this.notice.set('Esa mesa acaba de ocuparse. Elige otra mesa.')
        } else {
          this.notice.set('No se pudo reservar la mesa. Inténtalo de nuevo.')
        }
      }
    })
  }
}
