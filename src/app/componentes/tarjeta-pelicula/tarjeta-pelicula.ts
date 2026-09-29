import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../modelos/pelicula';

@Component({
  imports: [RouterLink],
  selector: 'app-tarjeta-pelicula',
  styleUrl: './tarjeta-pelicula.css',
  templateUrl: './tarjeta-pelicula.html',
})
export class TarjetaPelicula {
  @Input({ required: true }) pelicula!: Pelicula;
}
