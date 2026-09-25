import { Routes } from '@angular/router';

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
];
