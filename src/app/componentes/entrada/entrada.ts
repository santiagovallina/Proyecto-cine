import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, Input, OnChanges, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import QRCode from 'qrcode';
import { CompraCompleta } from '../../modelos/compra';
import { Compras } from '../../servicios/compras';
import { PdfEntrada } from '../../servicios/pdf-entrada';
import { Spinner } from '../spinner/spinner';

@Component({
  imports: [CurrencyPipe, DatePipe, RouterLink, Spinner],
  selector: 'app-entrada',
  styleUrl: './entrada.css',
  templateUrl: './entrada.html',
})
export class Entrada implements OnChanges {
  private comprasService = inject(Compras);
  private pdfService = inject(PdfEntrada);

  @Input({ required: true }) codigo!: string;

  compra = signal<CompraCompleta | null>(null);
  // La imagen del QR como data URL, lista para usar en un <img>.
  qr = signal('');
  cargando = signal(true);
  generandoPdf = signal(false);

  async ngOnChanges() {
    this.cargando.set(true);
    this.qr.set('');

    const compra = await this.comprasService.obtenerEntrada(this.codigo);
    this.compra.set(compra);

    if (compra) {
      // El QR guarda solo el código: es lo que el empleado valida.
      this.qr.set(await QRCode.toDataURL(compra.codigo, { width: 320, margin: 2 }));
    }

    this.cargando.set(false);
  }

  async descargarPdf() {
    const compra = this.compra();
    if (!compra || !this.qr()) return;

    this.generandoPdf.set(true);
    try {
      await this.pdfService.descargar(compra, this.qr());
    } finally {
      this.generandoPdf.set(false);
    }
  }
}
