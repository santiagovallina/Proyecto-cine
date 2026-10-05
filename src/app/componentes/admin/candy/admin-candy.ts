import { Component, inject, OnInit, signal } from '@angular/core';
import { ProductoCandy } from '../../../modelos/producto-candy';
import { Candy } from '../../../servicios/candy';
import { Spinner } from '../../spinner/spinner';
import { FilaProductoAdmin } from './fila-producto-admin/fila-producto-admin';

@Component({
  imports: [FilaProductoAdmin, Spinner],
  selector: 'app-admin-candy',
  styleUrls: ['../admin-compartido.css'],
  templateUrl: './admin-candy.html',
})
export class AdminCandy implements OnInit {
  private candyService = inject(Candy);

  productos = signal<ProductoCandy[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  readonly categorias = ['Pochoclos', 'Snacks', 'Golosinas', 'Bebidas', 'Combos'];

  async ngOnInit() {
    try {
      this.productos.set(await this.candyService.getTodosLosProductos());
    } catch {
      this.error.set('No se pudieron cargar los productos.');
    } finally {
      this.cargando.set(false);
    }
  }

  productosDe(categoria: string): ProductoCandy[] {
    return this.productos().filter((p) => p.categoria?.nombre === categoria);
  }
}
