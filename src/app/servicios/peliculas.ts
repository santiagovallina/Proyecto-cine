import { inject, Service } from '@angular/core';
import { Pelicula } from '../modelos/pelicula';
import { Supabase } from './supabase';

@Service()
export class Peliculas {
    private supabase = inject(Supabase).client;

    async getPeliculas(): Promise<Pelicula[]> {
        const { data, error } = await this.supabase
            .from('peliculas')
            .select('*, generos(nombre)')
            .eq('activa', true);
        
        if (error) throw error;
        return data as Pelicula[];
    }

    // Provisorio: todavía no hay ventas. Cuando exista la tabla de entradas,
    // acá se ordena por cantidad vendida.
    async getMasVendidas(): Promise<Pelicula[]> {
        const { data, error } = await this.supabase
            .from('peliculas')
            .select('*, generos(nombre)')
            .eq('activa', true)
            .order('id')
            .limit(3);

        if (error) throw error;
        return data as Pelicula[];
    }
}
