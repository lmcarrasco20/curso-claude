export interface PointsReward {
  id: string
  restaurantId: string
  points: number
  /** Descuento en euros */
  discount: number
  createdAt: string
  updatedAt: string
}

export interface PointsRewardDto {
  points: number
  discount: number
}
