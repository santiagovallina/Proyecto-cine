import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, Input, OnChanges, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Butaca, FilaButacas, precioButaca, tipoDeFila } from '../../modelos/butaca';
import { EstadoButaca, EstadoVisible } from '../../modelos/estado-butaca';
import { Funcion } from '../../modelos/funcion';
import { Butacas } from '../../servicios/butacas';
import { Carrito } from '../../servicios/carrito';
import { Funciones } from '../../servicios/funciones';
import { Spinner } from '../spinner/spinner';

const MAX_BUTACAS = 8;

function crearGrupo(fila: string, desde: number, cantidad: number, tipo: Butaca['tipo']): Butaca[] {
  return Array.from({ length: cantidad }, (_, i) => ({ fila, numero: desde + i, tipo }));
}

// Esquema fijo de la sala (igual para las 6): A-I, fila accesible, L-T.
function generarFilas(): FilaButacas[] {
  const letras = 'ABCDEFGHILMNOPQRST'.split('');
  const filas: FilaButacas[] = letras.map((letra) => {
    const tipo = tipoDeFila(letra);
    return {
      letra,
      tipo,
      grupos: [
        crearGrupo(letra, 1, 4, tipo),
        crearGrupo(letra, 5, 20, tipo),
        crearGrupo(letra, 25, 4, tipo),
      ],
    };
  });

  const accesible: FilaButacas = {
    letra: 'J',
    tipo: 'accesible',
    grupos: [
      crearGrupo('J', 1, 2, 'accesible'),
      crearGrupo('J', 3, 10, 'accesible'),
      crearGrupo('J', 13, 2, 'accesible'),
    ],
  };

  // La fila accesible reemplaza a J y K, así que va entre la I y la L.
  filas.splice(letras.indexOf('L'), 0, accesible);
  return filas;
}

function clave(butaca: { fila: string; numero: number }): string {
  return `${butaca.fila}${butaca.numero}`;
}

@Component({
  imports: [CurrencyPipe, DatePipe, RouterLink, Spinner],
  selector: 'app-mapa-butacas',
  styleUrl: './mapa-butacas.css',
  templateUrl: './mapa-butacas.html',
})
export class MapaButacas implements OnChanges, OnDestroy {
  private funcionesService = inject(Funciones);
  private butacasService = inject(Butacas);
  private carrito = inject(Carrito);
  private router = inject(Router);

  @Input({ required: true }) id!: string;

  funcion = signal<Funcion | null>(null);
  cargando = signal(true);
  aviso = signal('');

  readonly filas = generarFilas();
  readonly maximo = MAX_BUTACAS;
  private readonly todas = this.filas.flatMap((fila) => fila.grupos.flat());

  // Lo que hay en la tabla butacas_estado para esta función, por clave .
  private estados = signal(new Map<string, EstadoButaca>());
  private miHash = signal('');
  private ahora = signal(Date.now());

  private dejarDeEscuchar?: () => void;
  private reloj = setInterval(() => this.ahora.set(Date.now()), 1000);

  // Cómo se ve cada butaca. Las que no están en la tabla (o con bloqueo vencido) son libres.
  private estadosVisibles = computed(() => {
    const ahora = this.ahora();
    const miHash = this.miHash();
    const visibles = new Map<string, EstadoVisible>();

    for (const [butaca, e] of this.estados()) {
      if (e.estado === 'vendida') {
        visibles.set(butaca, 'vendida');
      } else if (e.expira_en && Date.parse(e.expira_en) > ahora) {
        visibles.set(butaca, e.sesion_hash === miHash ? 'elegida' : 'bloqueada');
      }
    }
    return visibles;
  });

  // Las butacas elegidas son las bloqueadas con MI sesión: no hay otra lista que mantener.
  seleccionadas = computed(() =>
    this.todas.filter((b) => this.estadosVisibles().get(clave(b)) === 'elegida'),
  );

  total = computed(() => {
    const precioBase = this.funcion()?.precio_base ?? 0;
    return this.seleccionadas().reduce((suma, b) => suma + precioButaca(precioBase, b.tipo), 0);
  });

  hayVip = computed(() => this.seleccionadas().some((b) => b.tipo === 'vip'));

  nombresSeleccionadas = computed(() => this.seleccionadas().map(clave).join(', '));

  // Tiempo hasta que venza la primera de mis butacas, en formato m:ss.
  tiempoRestante = computed(() => {
    const ahora = this.ahora();
    const miHash = this.miHash();
    let primerVencimiento = Infinity;

    for (const e of this.estados().values()) {
      if (e.estado === 'bloqueada' && e.sesion_hash === miHash && e.expira_en) {
        const vence = Date.parse(e.expira_en);
        if (vence > ahora && vence < primerVencimiento) primerVencimiento = vence;
      }
    }

    if (primerVencimiento === Infinity) return '';
    const segundos = Math.ceil((primerVencimiento - ahora) / 1000);
    return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
  });

  async ngOnChanges() {
    this.dejarDeEscuchar?.();
    this.cargando.set(true);
    this.aviso.set('');
    this.estados.set(new Map());
    this.funcion.set(await this.funcionesService.getFuncion(Number(this.id)));

    try {
      if (this.funcion()) {
        this.miHash.set(await this.butacasService.miHash);
        // Primero escucho y después cargo, para no perderme cambios mientras se lee la tabla.
        this.dejarDeEscuchar = this.butacasService.escuchar(Number(this.id), (registro, borrado) =>
          this.aplicarCambio(registro, borrado),
        );
        await this.cargarEstados();
      }
    } catch {
      this.aviso.set('No se pudo cargar el estado de las butacas. Recargá la página.');
    } finally {
      this.cargando.set(false);
    }
  }

  ngOnDestroy() {
    clearInterval(this.reloj);
    this.dejarDeEscuchar?.();
  }

  estadoDe(butaca: Butaca): EstadoVisible {
    return this.estadosVisibles().get(clave(butaca)) ?? 'libre';
  }

  async alternar(butaca: Butaca) {
    this.aviso.set('');
    const estado = this.estadoDe(butaca);
    if (estado === 'bloqueada' || estado === 'vendida') return;

    const funcionId = Number(this.id);

    try {
      if (estado === 'elegida') {
        await this.butacasService.liberar(funcionId, butaca.fila, butaca.numero);
        this.quitarEstado(clave(butaca));
        return;
      }

      if (this.seleccionadas().length >= MAX_BUTACAS) {
        this.aviso.set(`Podés elegir hasta ${MAX_BUTACAS} butacas por compra.`);
        return;
      }

      const venceEn = await this.butacasService.bloquear(funcionId, butaca.fila, butaca.numero);
      this.guardarEstado({
        funcion_id: funcionId,
        fila: butaca.fila,
        numero: butaca.numero,
        estado: 'bloqueada',
        sesion_hash: this.miHash(),
        expira_en: venceEn,
      });
    } catch (error) {
      // Lo más probable: otra persona la tomó justo antes. Se vuelve a leer el estado real.
      this.aviso.set((error as { message?: string }).message ?? 'No se pudo reservar la butaca.');
      await this.cargarEstados();
    }
  }

  // Las butacas ya quedaron reservadas a mi nombre en la base: el carrito solo recuerda la función.
  continuar() {
    this.carrito.elegirFuncion(Number(this.id));
    this.router.navigate(['/candy']);
  }

  etiqueta(butaca: Butaca, estado: EstadoVisible): string {
    const tipo = { normal: '', accesible: ', accesible', vip: ', VIP' }[butaca.tipo];
    const texto = {
      libre: 'libre',
      elegida: 'seleccionada',
      bloqueada: 'siendo elegida por otra persona',
      vendida: 'vendida',
    }[estado];
    return `Fila ${butaca.fila}, butaca ${butaca.numero}${tipo}, ${texto}`;
  }

  private async cargarEstados() {
    const lista = await this.butacasService.getEstados(Number(this.id));
    this.estados.set(new Map(lista.map((e) => [clave(e), e])));
  }

  // Eventos de Realtime. Mis propias acciones usan las mismas dos funciones.
  private aplicarCambio(registro: EstadoButaca, borrado: boolean) {
    if (borrado) {
      this.quitarEstado(clave(registro));
    } else {
      this.guardarEstado(registro);
    }
  }

  private guardarEstado(registro: EstadoButaca) {
    this.estados.update((actual) => new Map(actual).set(clave(registro), registro));
  }

  private quitarEstado(butaca: string) {
    this.estados.update((actual) => {
      const nuevo = new Map(actual);
      nuevo.delete(butaca);
      return nuevo;
    });
  }
}
