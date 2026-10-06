import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { form, FormField, min, required, submit } from '@angular/forms/signals';
import { Genero } from '../../../modelos/genero';
import { Pelicula } from '../../../modelos/pelicula';
import { Peliculas } from '../../../servicios/peliculas';
import { Spinner } from '../../spinner/spinner';

// Todo como texto o número simple: el <select> de edad trabaja con strings.
interface PeliculaForm {
  nombre: string;
  sinopsis: string;
  duracion_min: number;
  imagen_url: string;
  restriccion_edad: string;
}

const FORM_VACIO: PeliculaForm = {
  nombre: '',
  sinopsis: '',
  duracion_min: 120,
  imagen_url: '',
  restriccion_edad: '0',
};

@Component({
  imports: [FormField, Spinner],
  selector: 'app-admin-peliculas',
  styleUrls: ['../admin-compartido.css', './admin-peliculas.css'],
  templateUrl: './admin-peliculas.html',
})
export class AdminPeliculas implements OnInit {
  private peliculasService = inject(Peliculas);

  readonly edades = [
    { valor: '0', nombre: 'Apta para todo público' },
    { valor: '13', nombre: 'Mayores de 13 (+13)' },
    { valor: '18', nombre: 'Mayores de 18 (+18)' },
  ];

  peliculas = signal<Pelicula[]>([]);
  generos = signal<Genero[]>([]);
  cargando = signal(true);

  // null = se está agregando una película nueva; con id = se está editando esa.
  editandoId = signal<number | null>(null);
  activa = signal(true);
  generosElegidos = signal<number[]>([]);

  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  titulo = computed(() => (this.editandoId() === null ? 'Agregar película' : 'Editar película'));

  peliculaModel = signal<PeliculaForm>({ ...FORM_VACIO });

  peliculaForm = form(this.peliculaModel, (campos) => {
    required(campos.nombre, { message: 'El nombre es obligatorio' });
    required(campos.sinopsis, { message: 'La sinopsis es obligatoria' });
    min(campos.duracion_min, 1, { message: 'La duración debe ser mayor a 0' });
  });

  async ngOnInit() {
    try {
      const [peliculas, generos] = await Promise.all([
        this.peliculasService.getTodasParaAdmin(),
        this.peliculasService.getGeneros(),
      ]);
      this.peliculas.set(peliculas);
      this.generos.set(generos);
    } catch {
      this.error.set('No se pudieron cargar las películas.');
    } finally {
      this.cargando.set(false);
    }
  }

  editar(pelicula: Pelicula) {
    this.editandoId.set(pelicula.id);
    this.peliculaModel.set({
      nombre: pelicula.nombre,
      sinopsis: pelicula.sinopsis,
      duracion_min: pelicula.duracion_min,
      imagen_url: pelicula.imagen_url ?? '',
      restriccion_edad: String(pelicula.restriccion_edad),
    });
    this.activa.set(pelicula.activa);
    this.generosElegidos.set((pelicula.generos ?? []).map((g) => g.id as number));
    this.mensaje.set(null);
    this.error.set(null);
  }

  // Vuelve al formulario vacío, listo para agregar otra película.
  nueva() {
    this.editandoId.set(null);
    this.peliculaModel.set({ ...FORM_VACIO });
    this.activa.set(true);
    this.generosElegidos.set([]);
  }

  generoElegido(id: number): boolean {
    return this.generosElegidos().includes(id);
  }

  alternarGenero(id: number) {
    this.generosElegidos.update((lista) =>
      lista.includes(id) ? lista.filter((g) => g !== id) : [...lista, id],
    );
  }

  cambiarActiva(evento: Event) {
    this.activa.set((evento.target as HTMLInputElement).checked);
  }

  enviar(evento: Event) {
    evento.preventDefault();
    this.mensaje.set(null);
    this.error.set(null);

    submit(this.peliculaForm, async () => {
      const datos = this.peliculaModel();
      const editando = this.editandoId() !== null;

      try {
        await this.peliculasService.guardarPelicula(this.editandoId(), {
          nombre: datos.nombre,
          sinopsis: datos.sinopsis,
          duracion_min: datos.duracion_min,
          imagen_url: datos.imagen_url,
          restriccion_edad: Number(datos.restriccion_edad),
          activa: this.activa(),
          generos: this.generosElegidos(),
        });

        this.mensaje.set(
          editando ? `Se guardaron los cambios de "${datos.nombre}".` : `Se agregó "${datos.nombre}".`,
        );
        this.peliculas.set(await this.peliculasService.getTodasParaAdmin());
        if (!editando) this.nueva();
      } catch (e) {
        this.error.set((e as { message?: string }).message ?? 'No se pudo guardar la película.');
      }
    });
  }
}
