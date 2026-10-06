import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatosReporte } from '../../../modelos/reportes';
import { ExportarReporte } from '../../../servicios/exportar-reporte';
import { Reportes } from '../../../servicios/reportes';
import { Spinner } from '../../spinner/spinner';

@Component({
  imports: [CurrencyPipe, DatePipe, Spinner],
  selector: 'app-admin-reportes',
  styleUrls: ['../admin-compartido.css', './admin-reportes.css'],
  templateUrl: './admin-reportes.html',
})
export class AdminReportes implements OnInit {
  private reportesService = inject(Reportes);
  private exportador = inject(ExportarReporte);

  readonly periodos = [
    { dias: 7, nombre: 'Última semana' },
    { dias: 30, nombre: 'Último mes' },
  ];

  dias = signal(7);
  reporte = signal<DatosReporte | null>(null);
  cargando = signal(true);
  exportando = signal(false);
  error = signal<string | null>(null);

  // El valor más grande de cada lista: la barra más larga ocupa el 100% y las demás se escalan.
  maxFacturado = computed(() => this.maximo(this.reporte()?.facturacion.map((f) => f.facturado)));
  maxEntradas = computed(() => this.maximo(this.reporte()?.peliculas.map((p) => p.entradas_vendidas)));
  maxUnidades = computed(() => this.maximo(this.reporte()?.productos.map((p) => p.unidades)));

  totalFacturado = computed(
    () => this.reporte()?.facturacion.reduce((suma, f) => suma + f.facturado, 0) ?? 0,
  );
  totalCompras = computed(
    () => this.reporte()?.facturacion.reduce((suma, f) => suma + f.cantidad_compras, 0) ?? 0,
  );

  async ngOnInit() {
    await this.cargar();
  }

  async elegirPeriodo(dias: number) {
    this.dias.set(dias);
    await this.cargar();
  }

  ancho(valor: number, maximo: number): string {
    return `${Math.round((valor / maximo) * 100)}%`;
  }

  excel() {
    const reporte = this.reporte();
    if (reporte) this.exportador.descargarExcel(reporte);
  }

  async pdf() {
    const reporte = this.reporte();
    if (!reporte) return;

    this.exportando.set(true);
    try {
      await this.exportador.descargarPdf(reporte);
    } finally {
      this.exportando.set(false);
    }
  }

  private async cargar() {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.reporte.set(await this.reportesService.obtener(this.dias()));
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'No se pudo cargar el reporte.');
    } finally {
      this.cargando.set(false);
    }
  }

  // Nunca menor a 1, para no dividir por cero cuando todavía no hay ventas.
  private maximo(valores: number[] | undefined): number {
    return Math.max(1, ...(valores ?? []));
  }
}
