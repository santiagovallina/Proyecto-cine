import { formatDate } from '@angular/common';
import { Service } from '@angular/core';
import { CompraCompleta } from '../modelos/compra';

const MONEDA = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const MARGEN = 15;
const ANCHO_PAGINA = 210;
const DERECHA = ANCHO_PAGINA - MARGEN;

@Service()
export class PdfEntrada {
  // jsPDF pesa bastante: se descarga recién cuando alguien aprieta el botón.
  async descargar(compra: CompraCompleta, qr: string) {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = 0;

    const nuevaLineaSiHaceFalta = () => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
    };

    // Cabecera
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, ANCHO_PAGINA, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('CINE SAVA', MARGEN, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Tu entrada', DERECHA, 18, { align: 'right' });

    // Código en texto (a la izquierda) y QR (a la derecha)
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(10);
    doc.text('Tu código', MARGEN, 48);
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text(compra.codigo, MARGEN, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Presentá este QR (o el código) en el cine.', MARGEN, 68);
    doc.text('Sirve una sola vez para entrar.', MARGEN, 73);
    doc.addImage(qr, 'PNG', DERECHA - 55, 36, 55, 55);

    y = 105;
    doc.setTextColor(20, 20, 20);

    if (compra.entradas.length > 0) {
      const primera = compra.entradas[0];
      const cuando = formatDate(primera.inicia_en, "EEEE d 'de' MMMM, HH:mm", 'es-AR');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(primera.pelicula, MARGEN, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(cuando.charAt(0).toUpperCase() + cuando.slice(1), MARGEN, y);
      y += 6;
      doc.text(`${primera.formato} · ${primera.idioma} · ${primera.sala}`, MARGEN, y);
      y += 10;

      doc.setFont('helvetica', 'bold');
      doc.text('Butacas', MARGEN, y);
      y += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(MARGEN, y, DERECHA, y);
      y += 6;
      doc.setFont('helvetica', 'normal');

      for (const e of compra.entradas) {
        nuevaLineaSiHaceFalta();
        const tipo = e.tipo === 'vip' ? ' (VIP)' : e.tipo === 'accesible' ? ' (accesible)' : '';
        doc.text(`Butaca ${e.fila}${e.numero}${tipo}`, MARGEN, y);
        doc.text(MONEDA.format(e.precio), DERECHA, y, { align: 'right' });
        y += 6;
      }

      if (primera.restriccion_edad > 0) {
        y += 4;
        nuevaLineaSiHaceFalta();
        doc.setTextColor(185, 28, 28);
        doc.setFontSize(10);
        const aviso = doc.splitTextToSize(
          `Película para mayores de ${primera.restriccion_edad} años. Los menores deben ir acompañados de un adulto.`,
          DERECHA - MARGEN,
        );
        doc.text(aviso, MARGEN, y);
        y += aviso.length * 5;
        doc.setTextColor(20, 20, 20);
        doc.setFontSize(11);
      }

      y += 6;
    }

    if (compra.items.length > 0) {
      nuevaLineaSiHaceFalta();
      doc.setFont('helvetica', 'bold');
      doc.text('Candy', MARGEN, y);
      y += 3;
      doc.line(MARGEN, y, DERECHA, y);
      y += 6;
      doc.setFont('helvetica', 'normal');

      for (const item of compra.items) {
        nuevaLineaSiHaceFalta();
        doc.text(`${item.cantidad} x ${item.nombre}`, MARGEN, y);
        doc.text(MONEDA.format(item.precio_unitario * item.cantidad), DERECHA, y, {
          align: 'right',
        });
        y += 6;
      }
      y += 4;
    }

    nuevaLineaSiHaceFalta();
    doc.setDrawColor(20, 20, 20);
    doc.line(MARGEN, y, DERECHA, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Total', MARGEN, y);
    doc.text(MONEDA.format(compra.total), DERECHA, y, { align: 'right' });

    doc.save(`entrada-${compra.codigo}.pdf`);
  }
}
