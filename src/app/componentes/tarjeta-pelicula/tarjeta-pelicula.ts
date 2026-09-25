import { Component, Input } from '@angular/core';
import { Pelicula } from '../../modelos/pelicula';

@Component({
  imports: [],
  selector: 'app-tarjeta-pelicula',
  styleUrl: './tarjeta-pelicula.css',
  templateUrl: './tarjeta-pelicula.html',
})
export class TarjetaPelicula {
  @Input({ required: true }) pelicula!: Pelicula;
}
