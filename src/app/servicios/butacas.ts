import { inject, Service } from '@angular/core';
import { EstadoButaca } from '../modelos/estado-butaca';
import { Supabase } from './supabase';

// Id aleatorio por pestaña: identifica quién bloqueó cada butaca sin pedir login.
function obtenerSesionId(): string {
  try {
    const guardado = sessionStorage.getItem('sesion-butacas');
    if (guardado) return guardado;
    const nuevo = crypto.randomUUID();
    sessionStorage.setItem('sesion-butacas', nuevo);
    return nuevo;
  } catch {
    return crypto.randomUUID();
  }
}

// Mismo hash que calcula SQL: así reconocemos nuestros bloqueos sin conocer el id de nadie más.
async function sha256(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

@Service()
export class Butacas {
  private supabase = inject(Supabase).client;
  private sesionId = obtenerSesionId();

  readonly miHash = sha256(this.sesionId);

  async getEstados(funcionId: number): Promise<EstadoButaca[]> {
    const { data, error } = await this.supabase
      .from('butacas_estado')
      .select('*')
      .eq('funcion_id', funcionId);

    if (error) throw error;
    return data as EstadoButaca[];
  }

  // Devuelve cuándo vence el bloqueo.
  async bloquear(funcionId: number, fila: string, numero: number): Promise<string> {
    const { data, error } = await this.supabase.rpc('bloquear_butaca', {
      p_funcion_id: funcionId,
      p_fila: fila,
      p_numero: numero,
      p_sesion: this.sesionId,
    });

    if (error) throw error;
    return data as string;
  }

  async liberar(funcionId: number, fila: string, numero: number): Promise<void> {
    const { error } = await this.supabase.rpc('liberar_butaca', {
      p_funcion_id: funcionId,
      p_fila: fila,
      p_numero: numero,
      p_sesion: this.sesionId,
    });

    if (error) throw error;
  }

  // Avisa cada vez que cambia una butaca de esa función. Devuelve la función para dejar de escuchar.
  escuchar(
    funcionId: number,
    alCambiar: (registro: EstadoButaca, borrado: boolean) => void,
  ): () => void {
    const tabla = { schema: 'public', table: 'butacas_estado' };
    const filtro = `funcion_id=eq.${funcionId}`;

    const canal = this.supabase
      .channel(`butacas-${funcionId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', ...tabla, filter: filtro }, (cambio) =>
        alCambiar(cambio.new as EstadoButaca, false),
      )
      .on('postgres_changes', { event: 'UPDATE', ...tabla, filter: filtro }, (cambio) =>
        alCambiar(cambio.new as EstadoButaca, false),
      )
      // Supabase no permite filtrar los borrados en el servidor: se filtra acá.
      .on('postgres_changes', { event: 'DELETE', ...tabla }, (cambio) => {
        const viejo = cambio.old as Partial<EstadoButaca>;
        if (viejo.funcion_id === funcionId) alCambiar(viejo as EstadoButaca, true);
      })
      .subscribe();

    return () => {
      this.supabase.removeChannel(canal);
    };
  }
}
