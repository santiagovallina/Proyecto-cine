import { CategoriaCandy } from './categoria-candy';

export interface ProductoCandy {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagen_url: string | null;
  disponible: boolean;
  categoria?: CategoriaCandy;
}
