import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { Butaca, precioButaca, tipoDeFila } from '../../modelos/butaca';
import { Funcion } from '../../modelos/funcion';
import { Auth } from '../../servicios/auth';
import { Butacas } from '../../servicios/butacas';
import { Carrito } from '../../servicios/carrito';
import { Compras } from '../../servicios/compras';
import { Funciones } from '../../servicios/funciones';
import { Spinner } from '../spinner/spinner';

interface DatosCheckout {
  email: string;
}

@Component({
  imports: [CurrencyPipe, DatePipe, FormField, RouterLink, Spinner],
  selector: 'app-checkout',
  styleUrl: './checkout.css',
  templateUrl: './checkout.html',
})
export class Checkout implements OnInit {
  private auth = inject(Auth);
  private router = inject(Router);
  private butacasService = inject(Butacas);
  private funcionesService = inject(Funciones);
  private comprasService = inject(Compras);

  carrito = inject(Carrito);

  funcion = signal<Funcion | null>(null);
  // Las butacas que este navegador tiene reservadas en la función elegida.
  butacas = signal<Butaca[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  entiendeAviso = signal(false);

  datosModel = signal<DatosCheckout>({ email: '' });

  datosForm = form(this.datosModel, (campos) => {
    required(campos.email, { message: 'El email es obligatorio' });
    email(campos.email, { message: 'Ingresá un email válido' });
  });

  totalEntradas = computed(() => {
    const precioBase = this.funcion()?.precio_base ?? 0;
    return this.butacas().reduce((suma, b) => suma + precioButaca(precioBase, b.tipo), 0);
  });

  total = computed(() => this.totalEntradas() + this.carrito.totalCandy());

  hayEntradas = computed(() => this.butacas().length > 0);
  hayAlgo = computed(() => this.hayEntradas() || this.carrito.cantidadTotal() > 0);

  // Eligió función pero sus butacas ya no están reservadas a su nombre (venció el tiempo).
  reservaVencida = computed(() => this.carrito.funcionId() !== null && !this.hayEntradas());

  restriccionEdad = computed(() => this.funcion()?.pelicula?.restriccion_edad ?? 0);

  // A un usuario registrado SQL le comprueba la edad; a un anónimo se le pide confirmar el aviso.
  debeConfirmarAviso = computed(
    () => this.hayEntradas() && this.restriccionEdad() > 0 && !this.auth.logueado(),
  );

  async ngOnInit() {
    await this.auth.listo();
    this.datosModel.set({ email: this.auth.usuario()?.email ?? '' });

    const funcionId = this.carrito.funcionId();
    if (funcionId !== null) {
      await this.cargarEntradas(funcionId);
    }

    this.cargando.set(false);
  }

  precioDe(butaca: Butaca): number {
    return precioButaca(this.funcion()?.precio_base ?? 0, butaca.tipo);
  }

  pagar(evento: Event) {
    evento.preventDefault();
    this.error.set(null);

    if (this.debeConfirmarAviso() && !this.entiendeAviso()) {
      this.error.set('Tenés que confirmar el aviso para menores antes de pagar.');
      return;
    }

    submit(this.datosForm, async () => {
      try {
        const codigo = await this.comprasService.comprar({
          funcionId: this.hayEntradas() ? this.carrito.funcionId() : null,
          butacas: this.butacas().map((b) => ({ fila: b.fila, numero: b.numero })),
          items: this.carrito
            .items()
            .map((item) => ({ producto_id: item.producto.id, cantidad: item.cantidad })),
          email: this.datosModel().email,
        });

        this.carrito.vaciar();
        this.router.navigate(['/entrada', codigo]);
      } catch (e) {
        this.error.set((e as { message?: string }).message ?? 'No se pudo completar la compra.');
      }
    });
  }

  private async cargarEntradas(funcionId: number) {
    const funcion = await this.funcionesService.getFuncion(funcionId);
    if (!funcion) return;

    const [estados, miHash] = await Promise.all([
      this.butacasService.getEstados(funcionId),
      this.butacasService.miHash,
    ]);
    const ahora = Date.now();

    const mias = estados
      .filter(
        (e) =>
          e.estado === 'bloqueada' &&
          e.sesion_hash === miHash &&
          e.expira_en !== null &&
          Date.parse(e.expira_en) > ahora,
      )
      .map((e) => ({ fila: e.fila, numero: e.numero, tipo: tipoDeFila(e.fila) }))
      .sort((a, b) => a.fila.localeCompare(b.fila) || a.numero - b.numero);

    this.funcion.set(funcion);
    this.butacas.set(mias);
  }
}
