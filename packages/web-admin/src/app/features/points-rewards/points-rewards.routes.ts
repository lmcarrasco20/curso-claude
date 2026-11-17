import type { Routes } from '@angular/router'

export const POINTS_REWARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/points-rewards/points-rewards.component').then(m => m.PointsRewardsComponent)
  }
]
