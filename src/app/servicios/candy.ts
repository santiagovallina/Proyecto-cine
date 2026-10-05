import { inject, Service } from '@angular/core';
import { ProductoCandy } from '../modelos/producto-candy';
import { Supabase } from './supabase';

@Service()
export class Candy {
  private supabase = inject(Supabase).client;

  async getProductos(): Promise<ProductoCandy[]> {
    const { data, error } = await this.supabase
      .from('productos_candy')
      .select('*, categoria:categorias_candy(nombre)')
      .eq('disponible', true);

    if (error) throw error;
    return data as ProductoCandy[];
  }

  // Para el panel de admin: incluye también los productos no disponibles.
  async getTodosLosProductos(): Promise<ProductoCandy[]> {
    const { data, error } = await this.supabase
      .from('productos_candy')
      .select('*, categoria:categorias_candy(nombre)')
      .order('categoria_id')
      .order('nombre');

    if (error) throw error;
    return data as ProductoCandy[];
  }

  async actualizarProducto(id: number, precio: number, disponible: boolean): Promise<void> {
    const { error } = await this.supabase.rpc('actualizar_producto_candy', {
      p_id: id,
      p_precio: precio,
      p_disponible: disponible,
    });

    if (error) throw error;
  }
}
