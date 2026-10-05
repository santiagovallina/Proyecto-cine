import { Component, inject, Input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ProductoCandy } from '../../modelos/producto-candy';
import { Carrito } from '../../servicios/carrito';

@Component({
  imports: [CurrencyPipe],
  selector: 'app-tarjeta-producto-candy',
  styleUrl: './tarjeta-producto-candy.css',
  templateUrl: './tarjeta-producto-candy.html',
})
export class TarjetaProductoCandy {
  carrito = inject(Carrito);

  @Input({ required: true }) producto!: ProductoCandy;
}
