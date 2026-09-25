import { Component, Input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ProductoCandy } from '../../modelos/producto-candy';

@Component({
  imports: [CurrencyPipe],
  selector: 'app-tarjeta-producto-candy',
  styleUrl: './tarjeta-producto-candy.css',
  templateUrl: './tarjeta-producto-candy.html',
})
export class TarjetaProductoCandy {
  @Input({ required: true }) producto!: ProductoCandy;
}
