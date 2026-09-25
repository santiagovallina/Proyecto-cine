import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Pelicula } from '../../modelos/pelicula';
import { Peliculas } from '../../servicios/peliculas';
import { TarjetaPelicula } from '../tarjeta-pelicula/tarjeta-pelicula';

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

@Component({
  imports: [TarjetaPelicula, FormField],
  selector: 'app-cartelera',
  styleUrl: './cartelera.css',
  templateUrl: './cartelera.html',
})
export class Cartelera implements OnInit {
  private peliculasService = inject(Peliculas);

  peliculas = signal<Pelicula[]>([]);

  busquedaModel = signal({ texto: '' });
  busquedaForm = form(this.busquedaModel);

  generoSeleccionado = signal<string | null>(null);

  //calcula la cantidad de generos unicos
  generos = computed(() => {
    const nombres = this.peliculas().flatMap((p) => (p.generos ?? []).map((g) => g.nombre));
    return [...new Set(nombres)].sort();
  });

  peliculasFiltradas = computed(() => {
    const texto = normalizar(this.busquedaModel().texto.trim());
    const genero = this.generoSeleccionado();

    return this.peliculas().filter((p) => {
      const coincideNombre = normalizar(p.nombre).includes(texto);
      const coincideGenero = genero === null || (p.generos ?? []).some((g) => g.nombre === genero);
      return coincideNombre && coincideGenero;
    });
  });

  async ngOnInit() {
    this.peliculas.set(await this.peliculasService.getPeliculas());
  }

  seleccionarGenero(nombre: string | null) {
    this.generoSeleccionado.set(nombre);
  }
}
