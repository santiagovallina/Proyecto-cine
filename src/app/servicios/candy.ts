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
}
