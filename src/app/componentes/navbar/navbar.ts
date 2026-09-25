import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-navbar',
  styleUrl: './navbar.css',
  templateUrl: './navbar.html',
})
export class Navbar {
  private elementRef = inject(ElementRef);

  menuAbierto = signal(false);

  alternarMenu() {
    this.menuAbierto.update((abierto) => !abierto);
  }

  cerrarMenu() {
    this.menuAbierto.set(false);
  }

  @HostListener('document:click', ['$event'])
  cerrarAlClickearAfuera(evento: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(evento.target)) {
      this.cerrarMenu();
    }
  }
}
