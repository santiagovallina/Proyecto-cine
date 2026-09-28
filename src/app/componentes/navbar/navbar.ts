import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../servicios/auth';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-navbar',
  styleUrl: './navbar.css',
  templateUrl: './navbar.html',
})
export class Navbar {
  private elementRef = inject(ElementRef);
  private router = inject(Router);

  auth = inject(Auth);

  menuAbierto = signal(false);

  alternarMenu() {
    this.menuAbierto.update((abierto) => !abierto);
  }

  cerrarMenu() {
    this.menuAbierto.set(false);
  }

  async cerrarSesion() {
    await this.auth.salir();
    this.cerrarMenu();
    this.router.navigate(['/cartelera']);
  }

  @HostListener('document:click', ['$event'])
  cerrarAlClickearAfuera(evento: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(evento.target)) {
      this.cerrarMenu();
    }
  }
}
