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

    // Se pregunta el rol a la base en vez de leer auth.rol(): justo después de un login ese
    // signal puede seguir vacío (el perfil se carga en segundo plano) y el Guard rechazaría
    // por error a un empleado o admin legítimo.
    const rol = await auth.rolActual();

    if (rol !== null && rolesPermitidos.includes(rol)) {
      return true;
    }

    return router.createUrlTree(['/cartelera']);
  };
}
