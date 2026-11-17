export type PackCategory = 'entrante' | 'principal' | 'postre' | 'bebida'

export interface PackSlot {
  id: string
  category: PackCategory
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
  createdAt: string
  updatedAt: string
}

export interface PackDto {
  name: string
  description: string | null
  price: number
  available: boolean
  slots: { category: PackCategory; excludedDishIds: string[] }[]
}

export const PACK_CATEGORY_LABELS: Record<PackCategory, string> = {
  entrante: 'Entrante',
  principal: 'Principal',
  postre: 'Postre',
  bebida: 'Bebida'
}
