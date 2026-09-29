import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { form, FormField, min, required, submit } from '@angular/forms/signals';
import { Formato, Idioma } from '../../modelos/funcion';
import { Pelicula } from '../../modelos/pelicula';
import { Funciones } from '../../servicios/funciones';
import { Peliculas } from '../../servicios/peliculas';

interface NuevaFuncionForm {
  pelicula_id: string;
  fecha: string;
  hora: string;
  formato: Formato | '';
  idioma: Idioma | '';
  precio_base: number;
}

@Component({
  imports: [FormField, DatePipe],
  selector: 'app-admin',
  styleUrl: './admin.css',
  templateUrl: './admin.html',
})
export class Admin implements OnInit {
  private peliculasService = inject(Peliculas);
  private funcionesService = inject(Funciones);

  peliculas = signal<Pelicula[]>([]);
  readonly formatos: Formato[] = ['2D', '3D', '4D', '5D'];
  readonly idiomas: Idioma[] = ['Castellano', 'Subtitulada'];

  funcionModel = signal<NuevaFuncionForm>({
    pelicula_id: '',
    fecha: '',
    hora: '',
    formato: '',
    idioma: '',
    precio_base: 0,
  });

  funcionForm = form(this.funcionModel, (campos) => {
    required(campos.pelicula_id, { message: 'Elegí una película' });
    required(campos.fecha, { message: 'Elegí una fecha' });
    required(campos.hora, { message: 'Elegí una hora' });
    required(campos.formato, { message: 'Elegí un formato' });
    required(campos.idioma, { message: 'Elegí un idioma' });
    min(campos.precio_base, 0, { message: 'El precio no puede ser negativo' });
  });

  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);
  ultimasFunciones = signal<{ sala: string; inicia_en: string }[]>([]);

  async ngOnInit() {
    this.peliculas.set(await this.peliculasService.getPeliculas());
  }

  enviar(evento: Event) {
    evento.preventDefault();
    this.mensaje.set(null);
    this.error.set(null);

    submit(this.funcionForm, async () => {
      const datos = this.funcionModel();

      try {
        const inicioLocal = new Date(`${datos.fecha}T${datos.hora}:00`);

        const funcion = await this.funcionesService.crearFuncion({
          pelicula_id: Number(datos.pelicula_id),
          inicia_en: inicioLocal.toISOString(),
          formato: datos.formato as Formato,
          idioma: datos.idioma as Idioma,
          precio_base: datos.precio_base,
        });

        const pelicula = this.peliculas().find((p) => p.id === Number(datos.pelicula_id));
        const sala = funcion.sala?.nombre ?? `sala #${funcion.sala_id}`;
        this.mensaje.set(`Función de "${pelicula?.nombre}" creada en ${sala}.`);

        this.ultimasFunciones.update((lista) => [
          { sala, inicia_en: funcion.inicia_en },
          ...lista,
        ]);
      } catch (err) {
        this.error.set(
          err instanceof Error ? err.message : 'No se pudo crear la función.',
        );
      }
    });
  }
}
