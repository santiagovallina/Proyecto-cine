import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { CompraCompleta } from '../../modelos/compra';
import { Compras } from '../../servicios/compras';

interface BusquedaCodigo {
  codigo: string;
}

interface Resultado {
  tipo: 'ok' | 'error';
  texto: string;
}

@Component({
  imports: [CurrencyPipe, DatePipe, FormField],
  selector: 'app-empleado',
  styleUrl: './empleado.css',
  templateUrl: './empleado.html',
})
export class Empleado {
  private comprasService = inject(Compras);

  busquedaModel = signal<BusquedaCodigo>({ codigo: '' });

  busquedaForm = form(this.busquedaModel, (campos) => {
    required(campos.codigo, { message: 'Ingresá el código de la compra' });
  });

  compra = signal<CompraCompleta | null>(null);
  noEncontrada = signal(false);
  procesando = signal(false);
  resultado = signal<Resultado | null>(null);

  hayEntradas = computed(() => (this.compra()?.entradas.length ?? 0) > 0);
  hayCandy = computed(() => (this.compra()?.items.length ?? 0) > 0);
  entradasSinUsar = computed(() => this.compra()?.entradas.filter((e) => !e.usada).length ?? 0);

  buscar(evento: Event) {
    evento.preventDefault();

    submit(this.busquedaForm, async () => {
      this.resultado.set(null);
      this.noEncontrada.set(false);

      try {
        const compra = await this.comprasService.obtenerEntrada(this.codigoIngresado());
        this.compra.set(compra);
        this.noEncontrada.set(compra === null);
      } catch {
        this.compra.set(null);
        this.resultado.set({ tipo: 'error', texto: 'No se pudo consultar la compra.' });
      }
    });
  }

  validarEntrada() {
    return this.ejecutar(
      (codigo) => this.comprasService.validarEntrada(codigo),
      'Entrada validada. Pueden pasar.',
    );
  }

  entregarCandy() {
    return this.ejecutar(
      (codigo) => this.comprasService.entregarCandy(codigo),
      'Candy entregado.',
    );
  }

  private codigoIngresado(): string {
    return this.busquedaModel().codigo.trim().toUpperCase();
  }

  // Corre la acción de SQL y después vuelve a leer la compra, para mostrar el estado real.
  private async ejecutar(accion: (codigo: string) => Promise<void>, textoOk: string) {
    const actual = this.compra();
    if (!actual) return;

    this.procesando.set(true);
    this.resultado.set(null);

    try {
      await accion(actual.codigo);
      this.resultado.set({ tipo: 'ok', texto: textoOk });
    } catch (error) {
      const mensaje = (error as { message?: string }).message ?? 'No se pudo completar la acción.';
      this.resultado.set({ tipo: 'error', texto: mensaje });
    }

    this.compra.set(await this.comprasService.obtenerEntrada(actual.codigo));
    this.procesando.set(false);
  }
}
