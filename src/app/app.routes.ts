import { Routes } from '@angular/router';
import { rolGuard } from './guards/rol.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./componentes/inicio/inicio').then((m) => m.Inicio),
  },
  {
    path: 'cartelera',
    loadComponent: () => import('./componentes/cartelera/cartelera').then((m) => m.Cartelera),
  },
  {
    path: 'candy',
    loadComponent: () => import('./componentes/candy/candy').then((m) => m.Candy),
  },
  {
    path: 'pelicula/:id',
    loadComponent: () =>
      import('./componentes/detalle-pelicula/detalle-pelicula').then((m) => m.DetallePelicula),
  },
  {
    path: 'funcion/:id/butacas',
    loadComponent: () =>
      import('./componentes/mapa-butacas/mapa-butacas').then((m) => m.MapaButacas),
  },
  {
    path: 'checkout',
    loadComponent: () => import('./componentes/checkout/checkout').then((m) => m.Checkout),
  },
  {
    path: 'entrada/:codigo',
    loadComponent: () => import('./componentes/entrada/entrada').then((m) => m.Entrada),
  },
  {
    path: 'complejo',
    loadComponent: () => import('./componentes/complejo/complejo').then((m) => m.Complejo),
  },
  {
    path: 'login',
    loadComponent: () => import('./componentes/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./componentes/register/register').then((m) => m.Register),
  },
  {
    // El guard del padre protege también todas las rutas hijas.
    path: 'admin',
    canActivate: [rolGuard(['admin'])],
    loadComponent: () => import('./componentes/admin/admin').then((m) => m.Admin),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'funciones' },
      {
        path: 'funciones',
        loadComponent: () =>
          import('./componentes/admin/funciones/admin-funciones').then((m) => m.AdminFunciones),
      },
      {
        path: 'peliculas',
        loadComponent: () =>
          import('./componentes/admin/peliculas/admin-peliculas').then((m) => m.AdminPeliculas),
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('./componentes/admin/roles/admin-roles').then((m) => m.AdminRoles),
      },
      {
        path: 'candy',
        loadComponent: () =>
          import('./componentes/admin/candy/admin-candy').then((m) => m.AdminCandy),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./componentes/admin/reportes/admin-reportes').then((m) => m.AdminReportes),
      },
    ],
  },
  {
    path: 'empleado',
    canActivate: [rolGuard(['admin', 'empleado'])],
    loadComponent: () => import('./componentes/empleado/empleado').then((m) => m.Empleado),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./componentes/no-encontrado/no-encontrado').then((m) => m.NoEncontrado),
  },
];
