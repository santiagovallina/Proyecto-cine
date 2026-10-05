import { DatePipe } from '@angular/common';
import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { Formato, Funcion, Idioma } from '../../../../modelos/funcion';
import { Funciones } from '../../../../servicios/funciones';

interface ValoresFuncion {
  formato: Formato;
  idioma: Idioma;
  precio: number;
  activa: boolean;
}

// Una fila editable del panel de admin. Cada fila guarda su propio estado (lo que se
// está editando) y se guarda sola: el padre solo le pasa la función con @Input.
@Component({
  imports: [DatePipe],
  selector: 'app-fila-funcion-admin',
  styleUrls: ['../../admin-compartido.css', './fila-funcion-admin.css'],
  templateUrl: './fila-funcion-admin.html',
})
export class FilaFuncionAdmin implements OnInit {
  private funcionesService = inject(Funciones);

  @Input({ required: true }) funcion!: Funcion;

  readonly formatos: Formato[] = ['2D', '3D', '4D', '5D'];
  readonly idiomas: Idioma[] = ['Castellano', 'Subtitulada'];

  formato = signal<Formato>('2D');
  idioma = signal<Idioma>('Castellano');
  precio = signal(0);
  activa = signal(true);

  // Lo que hay guardado en la base: sirve para saber si hay cambios sin guardar.
  private guardado = signal<ValoresFuncion>({
    formato: '2D',
    idioma: 'Castellano',
    precio: 0,
    activa: true,
  });

  guardando = signal(false);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  hayCambios = computed(() => {
    const g = this.guardado();
    return (
      this.formato() !== g.formato ||
      this.idioma() !== g.idioma ||
      this.precio() !== g.precio ||
      this.activa() !== g.activa
    );
  });

  ngOnInit() {
    const valores: ValoresFuncion = {
      formato: this.funcion.formato,
      idioma: this.funcion.idioma,
      precio: Number(this.funcion.precio_base),
      activa: this.funcion.activa,
    };
    this.guardado.set(valores);
    this.formato.set(valores.formato);
    this.idioma.set(valores.idioma);
    this.precio.set(valores.precio);
    this.activa.set(valores.activa);
  }

  cambiarFormato(evento: Event) {
    this.formato.set((evento.target as HTMLSelectElement).value as Formato);
  }

  cambiarIdioma(evento: Event) {
    this.idioma.set((evento.target as HTMLSelectElement).value as Idioma);
  }

  cambiarPrecio(evento: Event) {
    this.precio.set(Number((evento.target as HTMLInputElement).value));
  }

  cambiarActiva(evento: Event) {
    this.activa.set((evento.target as HTMLInputElement).checked);
  }

  async guardar() {
    this.mensaje.set(null);
    this.error.set(null);

    if (this.precio() < 0 || Number.isNaN(this.precio())) {
      this.error.set('El precio no es válido.');
      return;
    }

    this.guardando.set(true);
    try {
      await this.funcionesService.actualizarFuncion(this.funcion.id, {
        formato: this.formato(),
        idioma: this.idioma(),
        precio_base: this.precio(),
        activa: this.activa(),
      });

      this.guardado.set({
        formato: this.formato(),
        idioma: this.idioma(),
        precio: this.precio(),
        activa: this.activa(),
      });
      this.mensaje.set('Guardado');
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'No se pudo guardar.');
    } finally {
      this.guardando.set(false);
    }
  }
}
