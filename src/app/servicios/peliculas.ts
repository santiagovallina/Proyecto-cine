import { inject, Service } from '@angular/core';
import { Genero } from '../modelos/genero';
import { DatosPelicula, Pelicula } from '../modelos/pelicula';
import { Supabase } from './supabase';

@Service()
export class Peliculas {
    private supabase = inject(Supabase).client;

    async getPelicula(id: number): Promise<Pelicula> {
        const { data, error } = await this.supabase
            .from('peliculas')
            .select('*, generos(nombre)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Pelicula;
    }

    async getPeliculas(): Promise<Pelicula[]> {
        const { data, error } = await this.supabase
            .from('peliculas')
            .select('*, generos(nombre)')
            .eq('activa', true);

        if (error) throw error;
        return data as Pelicula[];
    }

    // Las 3 películas con más entradas vendidas. El conteo lo hace una función SQL; después se
    // traen los datos de esas películas y se ordenan igual que el ranking.
    async getMasVendidas(): Promise<Pelicula[]> {
        const { data: ranking, error } = await this.supabase.rpc('peliculas_mas_vendidas', {
            p_limite: 3,
        });

        if (error) throw error;

        const ids = (ranking as { pelicula_id: number }[]).map((fila) => fila.pelicula_id);
        if (ids.length === 0) return [];

        const { data, error: errorPeliculas } = await this.supabase
            .from('peliculas')
            .select('*, generos(nombre)')
            .in('id', ids);

        if (errorPeliculas) throw errorPeliculas;

        const peliculas = data as Pelicula[];
        return ids
            .map((id) => peliculas.find((p) => p.id === id))
            .filter((p): p is Pelicula => p !== undefined);
    }

    // Para el panel de admin: también las películas que no están activas.
    async getTodasParaAdmin(): Promise<Pelicula[]> {
        const { data, error } = await this.supabase
            .from('peliculas')
            .select('*, generos(id, nombre)')
            .order('nombre');

        if (error) throw error;
        return data as Pelicula[];
    }

    async getGeneros(): Promise<Genero[]> {
        const { data, error } = await this.supabase.from('generos').select('*').order('nombre');

        if (error) throw error;
        return data as Genero[];
    }

    // Crea la película (id null) o edita una existente. Devuelve su id.
    async guardarPelicula(id: number | null, datos: DatosPelicula): Promise<number> {
        const { data, error } = await this.supabase.rpc('guardar_pelicula', {
            p_id: id,
            p_nombre: datos.nombre,
            p_sinopsis: datos.sinopsis,
            p_duracion: datos.duracion_min,
            p_imagen_url: datos.imagen_url,
            p_edad: datos.restriccion_edad,
            p_activa: datos.activa,
            p_generos: datos.generos,
        });

        if (error) throw error;
        return data as number;
    }
}
