import { TipoButaca } from './butaca';

// Lo que devuelve la función SQL obtener_entrada(codigo).
export interface EntradaComprada {
  fila: string;
  numero: number;
  tipo: TipoButaca;
  precio: number;
  usada: boolean;
  pelicula: string;
  restriccion_edad: number;
  inicia_en: string;
  formato: string;
  idioma: string;
  sala: string;
}

export interface ItemComprado {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export interface CompraCompleta {
  codigo: string;
  total: number;
  creada_en: string;
  candy_retirado: boolean;
  entradas: EntradaComprada[];
  items: ItemComprado[];
}

// Lo que se le manda a la función SQL comprar().
export interface PedidoCompra {
  funcionId: number | null;
  butacas: { fila: string; numero: number }[];
  items: { producto_id: number; cantidad: number }[];
  email: string;
}
