import { Component, ElementRef, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { DishStore } from '../../store/dish.store'
import { DishService } from '../../services/dish.service'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'
import type { CreateDishDto, DishCategory } from '../../models/dish.model'

@Component({
  selector: 'app-dish-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './dish-form.component.html',
  styleUrl: './dish-form.component.css'
})
export class DishFormComponent implements OnInit {
  private readonly store = inject(DishStore)
  private readonly service = inject(DishService)
  readonly ingredientStore = inject(IngredientStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  isEditing = false
  dishId: string | null = null
  restaurantId: string = ''
  loading = signal(false)
  error = signal<string | null>(null)
  fieldErrors = signal<{ name?: string; price?: string }>({})
  statusMessage = signal('')

  categories: DishCategory[] = ['entrante', 'principal', 'postre', 'bebida']

  form: CreateDishDto = {
    name: '',
    description: null,
    price: 0,
    category: 'principal',
    available: true,
    ingredients: []
  }

  newIngredientId = ''
  newIngredientQty = 1

  get pageTitle(): string {
    return this.isEditing ? 'Editar plato' : 'Nuevo plato'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/dishes`
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'entrante': 'Entrante',
      'principal': 'Principal',
      'postre': 'Postre',
      'bebida': 'Bebida'
    }
    return labels[category] ?? category
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (this.restaurantId) {
      this.ingredientStore.loadByRestaurant(this.restaurantId)
    }

    if (id && this.restaurantId) {
      this.isEditing = true
      this.dishId = id
      this.loadDish()
    }
  }

  private async loadDish(): Promise<void> {
    this.loading.set(true)
    try {
      const dish = await firstValueFrom(this.service.getById(this.restaurantId, this.dishId!))
      this.form = {
        name: dish.name,
        description: dish.description,
        price: dish.price,
        category: dish.category,
        available: dish.available,
        ingredients: [...dish.ingredients]
      }
    } catch {
      this.error.set('No se pudo cargar el plato.')
    } finally {
      this.loading.set(false)
    }
  }

  addIngredient(): void {
    if (!this.newIngredientId || this.newIngredientQty <= 0) return
    const exists = this.form.ingredients.find(i => i.ingredientId === this.newIngredientId)
    if (exists) return

    this.form.ingredients = [
      ...this.form.ingredients,
      { ingredientId: this.newIngredientId, quantity: this.newIngredientQty }
    ]
    this.statusMessage.set(`Ingrediente añadido: ${this.getIngredientName(this.newIngredientId)}`)
    this.newIngredientId = ''
    this.newIngredientQty = 1
  }

  onIngredientEnter(event: Event): void {
    // Enter en estos campos añade el ingrediente en lugar de enviar el formulario
    event.preventDefault()
    this.addIngredient()
  }

  removeIngredient(ingredientId: string): void {
    this.statusMessage.set(`Ingrediente quitado: ${this.getIngredientName(ingredientId)}`)
    this.form.ingredients = this.form.ingredients.filter(i => i.ingredientId !== ingredientId)
  }

  getIngredientName(ingredientId: string): string {
    const ingredient = this.ingredientStore.ingredients().find(i => i.id === ingredientId)
    return ingredient ? `${ingredient.name} (${ingredient.unit})` : ingredientId
  }

  private validate(): boolean {
    const errors: { name?: string; price?: string } = {}
    if (!this.form.name?.trim()) errors.name = 'El nombre del plato es obligatorio.'
    if (this.form.price === null || this.form.price === undefined || Number.isNaN(this.form.price) || this.form.price < 0) {
      errors.price = 'Introduce un precio igual o superior a 0.'
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
      if (this.isEditing && this.dishId) {
        await this.store.update(this.restaurantId, this.dishId, this.form)
      } else {
        await this.store.create(this.restaurantId, this.form)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'dishes'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar el plato.')
      this.focusFirst('#form-error')
    } finally {
      this.loading.set(false)
    }
  }
}
