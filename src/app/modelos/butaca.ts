export type TipoButaca = 'normal' | 'accesible' | 'vip';

export interface Butaca {
  fila: string;
  numero: number;
  tipo: TipoButaca;
}

// Una fila se divide en grupos separados por pasillos (4-20-4, o 2-10-2 en la accesible).
export interface FilaButacas {
  letra: string;
  tipo: TipoButaca;
  grupos: Butaca[][];
}

export const RECARGO_VIP = 1.5;

// Mismas reglas que la función SQL comprar(): R, S, T son VIP y J es la accesible.
export function tipoDeFila(fila: string): TipoButaca {
  if (['R', 'S', 'T'].includes(fila)) return 'vip';
  if (fila === 'J') return 'accesible';
  return 'normal';
}

// Solo para mostrar: el precio que se cobra de verdad lo calcula SQL.
export function precioButaca(precioBase: number, tipo: TipoButaca): number {
  return tipo === 'vip' ? precioBase * RECARGO_VIP : precioBase;
}
