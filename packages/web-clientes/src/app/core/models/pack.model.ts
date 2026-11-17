export interface PackSlot {
  id: string
  category: string
  /** Platos que no se pueden elegir en este hueco */
  excludedDishIds: string[]
}

export interface Pack {
  id: string
  restaurantId: string
  name: string
  description: string | null
  price: number
  available: boolean
  slots: PackSlot[]
}

export const SLOT_CATEGORY_LABELS: Record<string, string> = {
  entrante: 'Entrante',
  principal: 'Principal',
  postre: 'Postre',
  bebida: 'Bebida'
}
