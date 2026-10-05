import { inject, Service } from '@angular/core';
import { CompraCompleta, PedidoCompra } from '../modelos/compra';
import { Butacas } from './butacas';
import { Supabase } from './supabase';

@Service()
export class Compras {
  private supabase = inject(Supabase).client;
  private butacas = inject(Butacas);

  // Devuelve el código de la compra. Del navegador solo viajan ids y cantidades:
  // los precios los calcula la función SQL.
  async comprar(pedido: PedidoCompra): Promise<string> {
    const { data, error } = await this.supabase.rpc('comprar', {
      p_funcion_id: pedido.funcionId,
      p_butacas: pedido.butacas,
      p_items: pedido.items,
      p_email: pedido.email,
      p_sesion: this.butacas.sesionId,
    });

    if (error) throw error;
    return data as string;
  }

  async obtenerEntrada(codigo: string): Promise<CompraCompleta | null> {
    const { data, error } = await this.supabase.rpc('obtener_entrada', { p_codigo: codigo });

    if (error) throw error;
    return data as CompraCompleta | null;
  }

  // Marcan la entrada o el candy como usados. Solo funcionan para empleados y admins
  // (lo comprueba SQL) y fallan si ya se usaron: por eso el QR sirve una sola vez.
  async validarEntrada(codigo: string): Promise<void> {
    const { error } = await this.supabase.rpc('validar_entrada', { p_codigo: codigo });
    if (error) throw error;
  }

  async entregarCandy(codigo: string): Promise<void> {
    const { error } = await this.supabase.rpc('entregar_candy', { p_codigo: codigo });
    if (error) throw error;
  }
}
