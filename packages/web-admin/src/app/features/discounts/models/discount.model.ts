export type DiscountType = 'porcentaje' | 'importe'

export interface DiscountCode {
  id: string
  restaurantId: string
  code: string
  type: DiscountType
  value: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface DiscountDto {
  code: string
  type: DiscountType
  value: number
  active: boolean
}
