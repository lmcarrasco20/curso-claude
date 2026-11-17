export interface OrderItem {
  id: string
  dishId: string
  quantity: number
  notes: string | null
  status: string
  /** Pack al que pertenece el item, si se pidió dentro de un pack */
  orderPackId?: string | null
  dishName?: string
  dishPrice?: number
}

export interface Order {
  id: string
  restaurantId: string
  restaurantName?: string
  restaurantLogoUrl?: string | null
  tableId: string | null
  clientId: string | null
  createdAt: string
  items: OrderItem[]
  packs?: OrderPack[]
}

export interface OrderPack {
  id: string
  packId: string
  name: string
  price: number
}
