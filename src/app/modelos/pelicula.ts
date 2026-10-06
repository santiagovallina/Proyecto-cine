import { Genero } from './genero';

export interface Pelicula {
  id: number;
  nombre: string;
  sinopsis: string;
  duracion_min: number;
  imagen_url: string | null;
  restriccion_edad: number;
  activa: boolean;
  generos?: Genero[];
}

// Lo que el panel de admin manda para crear o editar una película.
export interface DatosPelicula {
  nombre: string;
  sinopsis: string;
  duracion_min: number;
  imagen_url: string;
  restriccion_edad: number;
  activa: boolean;
  generos: number[];
}
