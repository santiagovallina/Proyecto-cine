import { Component, inject, OnInit, signal } from '@angular/core';
import { form, FormField, min, required, submit } from '@angular/forms/signals';
import { Formato, Funcion, Idioma } from '../../../modelos/funcion';
import { Pelicula } from '../../../modelos/pelicula';
import { Funciones } from '../../../servicios/funciones';
import { Peliculas } from '../../../servicios/peliculas';
import { Spinner } from '../../spinner/spinner';
import { FilaFuncionAdmin } from './fila-funcion-admin/fila-funcion-admin';

interface NuevaFuncionForm {
  pelicula_id: string;
  fecha: string;
  hora: string;
  formato: Formato | '';
  idioma: Idioma | '';
  precio_base: number;
}

@Component({
  imports: [FormField, FilaFuncionAdmin, Spinner],
  selector: 'app-admin-funciones',
  styleUrls: ['../admin-compartido.css', './admin-funciones.css'],
  templateUrl: './admin-funciones.html',
})
export class AdminFunciones implements OnInit {
  private peliculasService = inject(Peliculas);
  private funcionesService = inject(Funciones);

  peliculas = signal<Pelicula[]>([]);
  readonly formatos: Formato[] = ['2D', '3D', '4D', '5D'];
  readonly idiomas: Idioma[] = ['Castellano', 'Subtitulada'];

  // --- Crear ---
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

  // --- Editar ---
  peliculaFiltro = signal('');
  fechaFiltro = signal(new Date().toLocaleDateString('en-CA'));
  funcionesDelDia = signal<Funcion[]>([]);
  cargandoLista = signal(false);
  errorLista = signal<string | null>(null);

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
        // El input trae la hora local; se manda en UTC (ISO) para que no se desfase.
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

        // Si justo se está mirando esa película y ese día, la lista se actualiza.
        if (
          this.peliculaFiltro() === datos.pelicula_id &&
          this.fechaFiltro() === datos.fecha
        ) {
          await this.cargarLista();
        }
      } catch (e) {
        this.error.set((e as { message?: string }).message ?? 'No se pudo crear la función.');
      }
    });
  }

  cambiarPelicula(evento: Event) {
    this.peliculaFiltro.set((evento.target as HTMLSelectElement).value);
    this.cargarLista();
  }

  cambiarFecha(evento: Event) {
    this.fechaFiltro.set((evento.target as HTMLInputElement).value);
    this.cargarLista();
  }

  private async cargarLista() {
    this.errorLista.set(null);

    if (!this.peliculaFiltro() || !this.fechaFiltro()) {
      this.funcionesDelDia.set([]);
      return;
    }

    this.cargandoLista.set(true);
    try {
      this.funcionesDelDia.set(
        await this.funcionesService.getFuncionesParaAdmin(
          Number(this.peliculaFiltro()),
          this.fechaFiltro(),
        ),
      );
    } catch {
      this.errorLista.set('No se pudieron cargar las funciones.');
    } finally {
      this.cargandoLista.set(false);
    }
  }
}
