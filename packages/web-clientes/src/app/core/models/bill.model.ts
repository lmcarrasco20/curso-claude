export interface Bill {
  id: string
  orderId: string
  clientId: string
  restaurantId: string
  discountCode: string | null
  subtotal: number
  codeDiscount: number
  pointsUsed: number
  pointsDiscount: number
  total: number
  createdAt: string
}

/** Equivalencia definida por el restaurante: `points` puntos = `discount` euros de descuento */
export interface PointsReward {
  id: string
  restaurantId: string
  points: number
  discount: number
}

export interface PointsBalance {
  restaurantId: string
  points: number
}

export interface BillRequest {
  discountCode: string | null
  pointsRewardId: string | null
}
