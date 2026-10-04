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
