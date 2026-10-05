import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductoCandy } from '../../modelos/producto-candy';
import { Candy as CandyService } from '../../servicios/candy';
import { Carrito } from '../../servicios/carrito';
import { Spinner } from '../spinner/spinner';
import { TarjetaProductoCandy } from '../tarjeta-producto-candy/tarjeta-producto-candy';

@Component({
  imports: [CurrencyPipe, RouterLink, TarjetaProductoCandy, Spinner],
  selector: 'app-candy',
  styleUrl: './candy.css',
  templateUrl: './candy.html',
})
export class Candy implements OnInit {
  private candyService = inject(CandyService);

  carrito = inject(Carrito);

  productos = signal<ProductoCandy[]>([]);
  cargando = signal(true);

  readonly categorias = ['Pochoclos', 'Snacks', 'Golosinas', 'Bebidas', 'Combos'];

  async ngOnInit() {
    this.productos.set(await this.candyService.getProductos());
    this.cargando.set(false);
  }

  productosDe(categoria: string): ProductoCandy[] {
    return this.productos().filter((p) => p.categoria?.nombre === categoria);
  }
}
