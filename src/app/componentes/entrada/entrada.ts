import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, Input, OnChanges, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompraCompleta } from '../../modelos/compra';
import { Compras } from '../../servicios/compras';
import { Spinner } from '../spinner/spinner';

@Component({
  imports: [CurrencyPipe, DatePipe, RouterLink, Spinner],
  selector: 'app-entrada',
  styleUrl: './entrada.css',
  templateUrl: './entrada.html',
})
export class Entrada implements OnChanges {
  private comprasService = inject(Compras);

  @Input({ required: true }) codigo!: string;

  compra = signal<CompraCompleta | null>(null);
  cargando = signal(true);

  async ngOnChanges() {
    this.cargando.set(true);
    this.compra.set(await this.comprasService.obtenerEntrada(this.codigo));
    this.cargando.set(false);
  }
}
