import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { ProductoCandy } from '../../../../modelos/producto-candy';
import { Candy } from '../../../../servicios/candy';

// Una fila editable de producto del candy: guarda su propio estado y se guarda sola.
@Component({
  selector: 'app-fila-producto-admin',
  styleUrls: ['../../admin-compartido.css', './fila-producto-admin.css'],
  templateUrl: './fila-producto-admin.html',
})
export class FilaProductoAdmin implements OnInit {
  private candyService = inject(Candy);

  @Input({ required: true }) producto!: ProductoCandy;

  precio = signal(0);
  disponible = signal(true);

  // Lo que hay guardado en la base, para saber si hay cambios sin guardar.
  private precioGuardado = signal(0);
  private disponibleGuardado = signal(true);

  guardando = signal(false);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  hayCambios = computed(
    () =>
      this.precio() !== this.precioGuardado() || this.disponible() !== this.disponibleGuardado(),
  );

  ngOnInit() {
    const precio = Number(this.producto.precio);
    this.precio.set(precio);
    this.precioGuardado.set(precio);
    this.disponible.set(this.producto.disponible);
    this.disponibleGuardado.set(this.producto.disponible);
  }

  cambiarPrecio(evento: Event) {
    this.precio.set(Number((evento.target as HTMLInputElement).value));
  }

  cambiarDisponible(evento: Event) {
    this.disponible.set((evento.target as HTMLInputElement).checked);
  }

  async guardar() {
    this.mensaje.set(null);
    this.error.set(null);

    if (Number.isNaN(this.precio()) || this.precio() < 0) {
      this.error.set('El precio no es válido.');
      return;
    }

    this.guardando.set(true);
    try {
      await this.candyService.actualizarProducto(this.producto.id, this.precio(), this.disponible());
      this.precioGuardado.set(this.precio());
      this.disponibleGuardado.set(this.disponible());
      this.mensaje.set('Guardado');
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'No se pudo guardar.');
    } finally {
      this.guardando.set(false);
    }
  }
}
