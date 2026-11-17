import type { Routes } from '@angular/router'

export const PACK_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/pack-list/pack-list.component').then(m => m.PackListComponent)
  }
]
