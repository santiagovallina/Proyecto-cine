import { Component, inject, OnInit, signal } from '@angular/core';
import { Pelicula } from '../../modelos/pelicula';
import { Peliculas } from '../../servicios/peliculas';
import { TarjetaPelicula } from '../tarjeta-pelicula/tarjeta-pelicula';

@Component({
  imports: [TarjetaPelicula],
  selector: 'app-inicio',
  styleUrl: './inicio.css',
  templateUrl: './inicio.html',
})
export class Inicio implements OnInit {
  private peliculasService = inject(Peliculas);

  masVendidas = signal<Pelicula[]>([]);

  async ngOnInit() {
    this.masVendidas.set(await this.peliculasService.getMasVendidas());
  }
}
