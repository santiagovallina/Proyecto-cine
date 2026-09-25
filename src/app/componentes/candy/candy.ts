import { Component, inject, OnInit, signal } from '@angular/core';
import { ProductoCandy } from '../../modelos/producto-candy';
import { Candy as CandyService } from '../../servicios/candy';
import { TarjetaProductoCandy } from '../tarjeta-producto-candy/tarjeta-producto-candy';

@Component({
  imports: [TarjetaProductoCandy],
  selector: 'app-candy',
  styleUrl: './candy.css',
  templateUrl: './candy.html',
})
export class Candy implements OnInit {
  private candyService = inject(CandyService);

  productos = signal<ProductoCandy[]>([]);

  readonly categorias = ['Pochoclos', 'Snacks', 'Golosinas', 'Bebidas', 'Combos'];

  async ngOnInit() {
    this.productos.set(await this.candyService.getProductos());
  }

  productosDe(categoria: string): ProductoCandy[] {
    return this.productos().filter((p) => p.categoria?.nombre === categoria);
  }
}
