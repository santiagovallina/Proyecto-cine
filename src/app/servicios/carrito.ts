import { computed, Service, signal } from '@angular/core';
import { ItemCarrito } from '../modelos/item-carrito';
import { ProductoCandy } from '../modelos/producto-candy';


const MAX_POR_PRODUCTO = 20;

@Service()
export class Carrito {
  readonly items = signal<ItemCarrito[]>([]);

  // Función cuyas entradas se están comprando, o null si es una compra solo de candy.
  // Las butacas en sí viven en butacas_estado, no acá.
  readonly funcionId = signal<number | null>(null);

  readonly cantidadTotal = computed(() =>
    this.items().reduce((suma, item) => suma + item.cantidad, 0),
  );

  // Solo para mostrar: el precio que se cobra de verdad lo calcula SQL al comprar.
  readonly totalCandy = computed(() =>
    this.items().reduce((suma, item) => suma + item.producto.precio * item.cantidad, 0),
  );

  cantidadDe(producto: ProductoCandy): number {
    return this.items().find((item) => item.producto.id === producto.id)?.cantidad ?? 0;
  }

  agregar(producto: ProductoCandy) {
    this.items.update((lista) => {
      if (!lista.some((item) => item.producto.id === producto.id)) {
        return [...lista, { producto, cantidad: 1 }];
      }
      return lista.map((item) =>
        item.producto.id === producto.id
          ? { ...item, cantidad: Math.min(item.cantidad + 1, MAX_POR_PRODUCTO) }
          : item,
      );
    });
  }

  quitar(producto: ProductoCandy) {
    this.items.update((lista) =>
      lista
        .map((item) =>
          item.producto.id === producto.id ? { ...item, cantidad: item.cantidad - 1 } : item,
        )
        .filter((item) => item.cantidad > 0),
    );
  }

  elegirFuncion(id: number | null) {
    this.funcionId.set(id);
  }

  vaciar() {
    this.items.set([]);
    this.funcionId.set(null);
  }
}
