import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../modelos/pelicula';
import { ProductoCandy } from '../../modelos/producto-candy';
import { Candy } from '../../servicios/candy';
import { Peliculas } from '../../servicios/peliculas';
import { Spinner } from '../spinner/spinner';
import { TarjetaProductoCandy } from '../tarjeta-producto-candy/tarjeta-producto-candy';

const SEGUNDOS_POR_SLIDE = 6;

@Component({
  imports: [RouterLink, Spinner, TarjetaProductoCandy],
  selector: 'app-inicio',
  styleUrl: './inicio.css',
  templateUrl: './inicio.html',
})
export class Inicio implements OnInit, OnDestroy {
  private peliculasService = inject(Peliculas);
  private candyService = inject(Candy);

  // Las 3 más vendidas, en orden: son las diapositivas del carrusel.
  masVendidas = signal<Pelicula[]>([]);
  candyDestacado = signal<ProductoCandy[]>([]);
  cargando = signal(true);

  // Qué diapositiva se ve, y si el carrusel está en pausa (el mouse está encima o hay foco adentro).
  indice = signal(0);
  pausado = signal(false);

  // El carrusel es una tira horizontal con todas las diapositivas: se mueve corriéndola a la izquierda.
  desplazamiento = computed(() => `translateX(-${this.indice() * 100}%)`);

  private reloj = setInterval(() => this.avanzarSolo(), SEGUNDOS_POR_SLIDE * 1000);

  ngOnInit() {
    // Cada bloque se carga por su cuenta: si uno falla, el otro se sigue viendo.
    this.cargarMasVendidas();
    this.cargarCandy();
  }

  ngOnDestroy() {
    clearInterval(this.reloj);
  }

  siguiente() {
    const cantidad = this.masVendidas().length;
    if (cantidad > 0) this.indice.update((i) => (i + 1) % cantidad);
  }

  anterior() {
    const cantidad = this.masVendidas().length;
    if (cantidad > 0) this.indice.update((i) => (i - 1 + cantidad) % cantidad);
  }

  ir(posicion: number) {
    this.indice.set(posicion);
  }

  // Pasa sola cada pocos segundos, salvo que el usuario esté mirando el carrusel o prefiera
  // menos movimiento (configuración de accesibilidad del sistema).
  private avanzarSolo() {
    const prefiereQuieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!this.pausado() && !prefiereQuieto && this.masVendidas().length > 1) {
      this.siguiente();
    }
  }

  private async cargarMasVendidas() {
    try {
      this.masVendidas.set(await this.peliculasService.getMasVendidas());
    } finally {
      this.cargando.set(false);
    }
  }

  // Primero los combos; si no hay suficientes, se completa con otros productos.
  private async cargarCandy() {
    try {
      const productos = await this.candyService.getProductos();
      const combos = productos.filter((p) => p.categoria?.nombre === 'Combos');
      const otros = productos.filter((p) => p.categoria?.nombre !== 'Combos');
      this.candyDestacado.set([...combos, ...otros].slice(0, 4));
    } catch {
      this.candyDestacado.set([]);
    }
  }
}
