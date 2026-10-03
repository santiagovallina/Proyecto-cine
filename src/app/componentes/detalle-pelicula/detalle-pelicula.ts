import { Component, inject, Input, OnChanges, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Funcion } from '../../modelos/funcion';
import { Pelicula } from '../../modelos/pelicula';
import { Funciones } from '../../servicios/funciones';
import { Peliculas } from '../../servicios/peliculas';
import { Spinner } from '../spinner/spinner';

function aTextoFecha(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function proximosDias(cantidad: number): string[] {
  const dias: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + i);
    dias.push(aTextoFecha(fecha));
  }
  return dias;
}

@Component({
  imports: [DatePipe, Spinner],
  selector: 'app-detalle-pelicula',
  styleUrl: './detalle-pelicula.css',
  templateUrl: './detalle-pelicula.html',
})
export class DetallePelicula implements OnChanges {
  private peliculasService = inject(Peliculas);
  private funcionesService = inject(Funciones);

  @Input({ required: true }) id!: string;

  pelicula = signal<Pelicula | null>(null);
  funciones = signal<Funcion[]>([]);
  cargandoFunciones = signal(false);

  readonly dias = proximosDias(7);
  fechaSeleccionada = signal(this.dias[0]);

  async ngOnChanges() {
    this.pelicula.set(await this.peliculasService.getPelicula(Number(this.id)));
    await this.cargarFunciones();
  }

  async seleccionarFecha(fecha: string) {
    this.fechaSeleccionada.set(fecha);
    await this.cargarFunciones();
  }

  private async cargarFunciones() {
    this.cargandoFunciones.set(true);
    this.funciones.set(
      await this.funcionesService.getFuncionesPorPeliculaYFecha(
        Number(this.id),
        this.fechaSeleccionada(),
      ),
    );
    this.cargandoFunciones.set(false);
  }
}
