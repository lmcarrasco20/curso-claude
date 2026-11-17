import { inject } from '@angular/core'
import { Router, type CanActivateFn } from '@angular/router'
import { AuthStore } from './auth.store'

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore)
  const router = inject(Router)

  if (auth.isAuthenticated()) return true
  return router.createUrlTree(['/login'])
}

/** Ruta inicial de cada rol de empleado en web-empleados. */
const DEFAULT_ROUTE_BY_ROLE: Record<string, string> = {
  cocinero: '/cocina',
  manager: '/cocina',
  camarero: '/barra'
}

/**
 * Permite el acceso solo a los roles indicados. Si el usuario está autenticado pero
 * su rol no está permitido, lo redirige a la página que sí le corresponde.
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => () => {
  const auth = inject(AuthStore)
  const router = inject(Router)

  if (!auth.isAuthenticated()) return router.createUrlTree(['/login'])

  const role = auth.userRole()
  if (role && allowedRoles.includes(role)) return true

  // Los destinos por defecto siempre están permitidos para su rol, así que no hay bucles
  const fallback = role ? DEFAULT_ROUTE_BY_ROLE[role] : undefined
  return router.createUrlTree([fallback ?? '/login'])
}
