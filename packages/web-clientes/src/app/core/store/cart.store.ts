import { Injectable, signal, computed } from '@angular/core'
import type { Pack } from '../models/pack.model'

export interface Dish {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  available: boolean
  restaurantId: string
  ingredients: { ingredientId: string; quantity: number }[]
}

export interface CartTable {
  id: string
  number: number
  restaurantId: string
}

export interface PackSelectionLine {
  slotId: string
  dishId: string
  dishName: string
}

/** Línea del carrito con un pack y el plato elegido en cada uno de sus huecos */
export interface CartPack {
  id: string
  pack: Pack
  selections: PackSelectionLine[]
  quantity: number
}

export interface CartItem {
  dish: Dish
  quantity: number
  notes: string
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<CartItem[]>([])
  private readonly _restaurantId = signal<string | null>(null)
  private readonly _table = signal<CartTable | null>(null)
  private readonly _packs = signal<CartPack[]>([])

  readonly items = this._items.asReadonly()
  readonly packs = this._packs.asReadonly()
  readonly isEmpty = computed(() => this._items().length === 0 && this._packs().length === 0)
  /** Mesa elegida por el cliente; se conserva tras confirmar un pedido para poder seguir pidiendo */
  readonly table = this._table.asReadonly()
  readonly restaurantId = this._restaurantId.asReadonly()

  readonly total = computed(() =>
    this._items().reduce((sum, item) => sum + item.dish.price * item.quantity, 0) +
    this._packs().reduce((sum, line) => sum + line.pack.price * line.quantity, 0)
  )

  readonly itemCount = computed(() =>
    this._items().reduce((count, item) => count + item.quantity, 0) +
    this._packs().reduce((count, line) => count + line.quantity, 0)
  )

  setTable(table: CartTable): void {
    this._table.set(table)
  }

  clearTable(): void {
    this._table.set(null)
  }

  addItem(dish: Dish, quantity: number = 1, notes: string = ''): void {
    if (this._restaurantId() && this._restaurantId() !== dish.restaurantId) {
      this._items.set([])
      this._packs.set([])
    }
    this._restaurantId.set(dish.restaurantId)

    const existingIndex = this._items().findIndex(
      item => item.dish.id === dish.id && item.notes === notes
    )

    if (existingIndex >= 0) {
      const items = [...this._items()]
      items[existingIndex] = {
        ...items[existingIndex],
        quantity: items[existingIndex].quantity + quantity
      }
      this._items.set(items)
    } else {
      this._items.update(items => [...items, { dish, quantity, notes }])
    }
  }

  removeItem(dishId: string): void {
    const items = this._items().filter(item => item.dish.id !== dishId)
    this._items.set(items)
    if (items.length === 0 && this._packs().length === 0) {
      this._restaurantId.set(null)
    }
  }

  addPack(pack: Pack, selections: PackSelectionLine[], quantity: number = 1): void {
    if (this._restaurantId() && this._restaurantId() !== pack.restaurantId) {
      this._items.set([])
      this._packs.set([])
    }
    this._restaurantId.set(pack.restaurantId)

    // El mismo pack con los mismos platos elegidos se agrupa en una sola línea
    const key = (lines: PackSelectionLine[]) => lines.map(l => `${l.slotId}:${l.dishId}`).sort().join('|')
    const existing = this._packs().find(line => line.pack.id === pack.id && key(line.selections) === key(selections))
    if (existing) {
      this._packs.update(list => list.map(line => (line.id === existing.id ? { ...line, quantity: line.quantity + quantity } : line)))
    } else {
      this._packs.update(list => [...list, { id: crypto.randomUUID(), pack, selections, quantity }])
    }
  }

  removePack(lineId: string): void {
    this._packs.update(list => list.filter(line => line.id !== lineId))
    if (this._items().length === 0 && this._packs().length === 0) {
      this._restaurantId.set(null)
    }
  }

  updatePackQuantity(lineId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removePack(lineId)
      return
    }
    this._packs.update(list => list.map(line => (line.id === lineId ? { ...line, quantity } : line)))
  }

  updateQuantity(dishId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(dishId)
      return
    }
    const items = this._items().map(item =>
      item.dish.id === dishId ? { ...item, quantity } : item
    )
    this._items.set(items)
  }

  clear(): void {
    this._items.set([])
    this._packs.set([])
    this._restaurantId.set(null)
  }
}
