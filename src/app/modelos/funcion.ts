import { Sala } from './sala';

export type Formato = '2D' | '3D' | '4D' | '5D';
export type Idioma = 'Castellano' | 'Subtitulada';

export interface Funcion {
  id: number;
  pelicula_id: number;
  sala_id: number;
  inicia_en: string;
  termina_en: string;
  formato: Formato;
  idioma: Idioma;
  precio_base: number;
  activa: boolean;
  sala?: Sala;
}

export interface NuevaFuncion {
  pelicula_id: number;
  inicia_en: string;
  formato: Formato;
  idioma: Idioma;
  precio_base: number;
}
