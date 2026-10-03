import { Component, inject, OnInit, signal } from '@angular/core';
import { Pelicula } from '../../modelos/pelicula';
import { Peliculas } from '../../servicios/peliculas';
import { Spinner } from '../spinner/spinner';
import { TarjetaPelicula } from '../tarjeta-pelicula/tarjeta-pelicula';

@Component({
  imports: [TarjetaPelicula, Spinner],
  selector: 'app-inicio',
  styleUrl: './inicio.css',
  templateUrl: './inicio.html',
})
export class Inicio implements OnInit {
  private peliculasService = inject(Peliculas);

  masVendidas = signal<Pelicula[]>([]);
  cargando = signal(true);

  async ngOnInit() {
    this.masVendidas.set(await this.peliculasService.getMasVendidas());
    this.cargando.set(false);
  }
}
