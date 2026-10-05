import { inject, Service } from '@angular/core';
import { Formato, Funcion, Idioma, NuevaFuncion } from '../modelos/funcion';
import { Supabase } from './supabase';

@Service()
export class Funciones {
  private supabase = inject(Supabase).client;

  // El día se interpreta en la hora local del navegador y se pasa a UTC (ISO): sin esto, una
  // función de las 22:00 en Argentina (01:00 UTC del día siguiente) aparecería en el día equivocado.
  private limitesDelDia(fecha: string): { desde: string; hasta: string } {
    return {
      desde: new Date(`${fecha}T00:00:00`).toISOString(),
      hasta: new Date(`${fecha}T23:59:59.999`).toISOString(),
    };
  }

  async getFuncionesPorPeliculaYFecha(peliculaId: number, fecha: string): Promise<Funcion[]> {
    const { desde, hasta } = this.limitesDelDia(fecha);

    const { data, error } = await this.supabase
      .from('funciones')
      .select('*, sala:salas(id, nombre)')
      .eq('pelicula_id', peliculaId)
      .eq('activa', true)
      .gte('inicia_en', desde)
      .lte('inicia_en', hasta)
      // Las funciones que ya empezaron no se pueden comprar.
      .gt('inicia_en', new Date().toISOString())
      .order('inicia_en');

    if (error) throw error;
    return data as Funcion[];
  }

  // Para el panel de admin: todas las funciones de ese día, también las canceladas.
  async getFuncionesParaAdmin(peliculaId: number, fecha: string): Promise<Funcion[]> {
    const { desde, hasta } = this.limitesDelDia(fecha);

    const { data, error } = await this.supabase
      .from('funciones')
      .select('*, sala:salas(id, nombre)')
      .eq('pelicula_id', peliculaId)
      .gte('inicia_en', desde)
      .lte('inicia_en', hasta)
      .order('inicia_en');

    if (error) throw error;
    return data as Funcion[];
  }

  async actualizarFuncion(
    id: number,
    cambios: { formato: Formato; idioma: Idioma; precio_base: number; activa: boolean },
  ): Promise<void> {
    const { error } = await this.supabase.rpc('actualizar_funcion', {
      p_id: id,
      p_formato: cambios.formato,
      p_idioma: cambios.idioma,
      p_precio: cambios.precio_base,
      p_activa: cambios.activa,
    });

    if (error) throw error;
  }

  async getFuncion(id: number): Promise<Funcion | null> {
    const { data, error } = await this.supabase
      .from('funciones')
      .select('*, sala:salas(id, nombre), pelicula:peliculas(*)')
      .eq('id', id)
      .eq('activa', true)
      .gt('inicia_en', new Date().toISOString())
      .maybeSingle();

    if (error) throw error;
    return data as Funcion | null;
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
