import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Rol } from '../modelos/perfil';
import { Auth } from '../servicios/auth';

export function rolGuard(rolesPermitidos: Rol[]): CanMatchFn {
  return async () => {
    const auth = inject(Auth);
    const router = inject(Router);

    await auth.listo();

    if (!auth.logueado()) {
      return router.createUrlTree(['/login']);
    }

    if (rolesPermitidos.includes(auth.rol() as Rol)) {
      return true;
    }

    return router.createUrlTree(['/cartelera']);
  };
}
