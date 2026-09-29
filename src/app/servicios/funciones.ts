import { inject, Service } from '@angular/core';
import { Funcion, NuevaFuncion } from '../modelos/funcion';
import { Supabase } from './supabase';

@Service()
export class Funciones {
  private supabase = inject(Supabase).client;

  async getFuncionesPorPeliculaYFecha(peliculaId: number, fecha: string): Promise<Funcion[]> {
    const desde = `${fecha}T00:00:00`;
    const hasta = `${fecha}T23:59:59`;

    const { data, error } = await this.supabase
      .from('funciones')
      .select('*, sala:salas(id, nombre)')
      .eq('pelicula_id', peliculaId)
      .eq('activa', true)
      .gte('inicia_en', desde)
      .lte('inicia_en', hasta)
      .order('inicia_en');

    if (error) throw error;
    return data as Funcion[];
  }

  async crearFuncion(datos: NuevaFuncion): Promise<Funcion> {
    const { data, error } = await this.supabase.rpc('crear_funcion', {
      p_pelicula_id: datos.pelicula_id,
      p_inicia_en: datos.inicia_en,
      p_formato: datos.formato,
      p_idioma: datos.idioma,
      p_precio_base: datos.precio_base,
    });

    if (error) throw error;
    return data as Funcion;
  }
}
