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
    path: 'admin',
    canMatch: [rolGuard(['admin'])],
    loadComponent: () => import('./componentes/admin/admin').then((m) => m.Admin),
  },
  {
    path: 'empleado',
    canMatch: [rolGuard(['admin', 'empleado'])],
    loadComponent: () => import('./componentes/empleado/empleado').then((m) => m.Empleado),
  },
];
