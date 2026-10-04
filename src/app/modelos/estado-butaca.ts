// Fila de la tabla butacas_estado. Una butaca que no está en la tabla está libre.
export interface EstadoButaca {
  funcion_id: number;
  fila: string;
  numero: number;
  estado: 'bloqueada' | 'vendida';
  sesion_hash: string;
  expira_en: string | null;
}

// Cómo se ve cada butaca para quien mira el mapa.
export type EstadoVisible = 'libre' | 'elegida' | 'bloqueada' | 'vendida';
