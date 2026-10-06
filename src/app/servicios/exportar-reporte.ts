import { Service } from '@angular/core';
import { DatosReporte } from '../modelos/reportes';

const MONEDA = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

// Exporta el reporte a Excel (CSV) y a PDF.
@Service()
export class ExportarReporte {
  // CSV con ";" como separador y BOM: así Excel en castellano lo abre en columnas y con tildes.
  descargarExcel(reporte: DatosReporte) {
    const lineas: string[] = [
      `Reporte de ventas - Cine SAVA;Últimos ${reporte.dias} días`,
      '',
      'FACTURACIÓN DIARIA',
      'Día;Compras;Facturado',
      ...reporte.facturacion.map((f) => `${f.dia};${f.cantidad_compras};${f.facturado}`),
      '',
      'PELÍCULAS MÁS VENDIDAS',
      'Película;Entradas;Facturado',
      ...reporte.peliculas.map((p) => `${this.texto(p.nombre_pelicula)};${p.entradas_vendidas};${p.facturado}`),
      '',
      'PRODUCTOS MÁS VENDIDOS',
      'Producto;Unidades;Facturado',
      ...reporte.productos.map((p) => `${this.texto(p.nombre_producto)};${p.unidades};${p.facturado}`),
    ];

    const contenido = '﻿' + lineas.join('\r\n');
    descargar(new Blob([contenido], { type: 'text/csv;charset=utf-8' }), `reporte-${reporte.dias}-dias.csv`);
  }

  // jsPDF pesa bastante: se descarga recién cuando se pide el PDF.
  async descargarPdf(reporte: DatosReporte) {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const IZQ = 15;
    const DER = 195;
    let y = 22;

    const salto = (alto = 6) => {
      y += alto;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    };

    const titulo = (texto: string) => {
      salto(6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(texto, IZQ, y);
      doc.setDrawColor(200, 200, 200);
      doc.line(IZQ, y + 2, DER, y + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      salto(8);
    };

    const fila = (izquierda: string, centro: string, derecha: string) => {
      doc.text(izquierda, IZQ, y);
      doc.text(centro, 130, y, { align: 'right' });
      doc.text(derecha, DER, y, { align: 'right' });
      salto(5.5);
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Reporte de ventas - Cine SAVA', IZQ, y);
    salto(8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(`Últimos ${reporte.dias} días`, IZQ, y);
    doc.setTextColor(20, 20, 20);

    titulo('Facturación diaria');
    fila('Día', 'Compras', 'Facturado');
    for (const f of reporte.facturacion) {
      fila(f.dia, String(f.cantidad_compras), MONEDA.format(f.facturado));
    }
    const total = reporte.facturacion.reduce((suma, f) => suma + f.facturado, 0);
    doc.setFont('helvetica', 'bold');
    fila('Total del período', '', MONEDA.format(total));
    doc.setFont('helvetica', 'normal');

    titulo('Películas más vendidas');
    fila('Película', 'Entradas', 'Facturado');
    for (const p of reporte.peliculas) {
      fila(p.nombre_pelicula, String(p.entradas_vendidas), MONEDA.format(p.facturado));
    }
    if (reporte.peliculas.length === 0) fila('Sin ventas en el período', '', '');

    titulo('Productos más vendidos');
    fila('Producto', 'Unidades', 'Facturado');
    for (const p of reporte.productos) {
      fila(p.nombre_producto, String(p.unidades), MONEDA.format(p.facturado));
    }
    if (reporte.productos.length === 0) fila('Sin ventas en el período', '', '');

    doc.save(`reporte-${reporte.dias}-dias.pdf`);
  }

  // Un nombre con ";" o comillas rompería las columnas del CSV.
  private texto(valor: string): string {
    return /[;"\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
  }
}
