import { inject, Service } from '@angular/core';
import {
  DatosReporte,
  FilaFacturacion,
  FilaPelicula,
  FilaProducto,
} from '../modelos/reportes';
import { Supabase } from './supabase';

// Reportes del panel de admin. El cálculo lo hacen funciones SQL que verifican que quien
// llama sea admin; acá solo se piden y se convierten los números (SQL los devuelve como texto).
@Service()
export class Reportes {
  private supabase = inject(Supabase).client;

  async obtener(dias: number): Promise<DatosReporte> {
    const [facturacion, peliculas, productos] = await Promise.all([
      this.pedir<FilaFacturacion>('reporte_facturacion', dias),
      this.pedir<FilaPelicula>('reporte_peliculas', dias),
      this.pedir<FilaProducto>('reporte_productos', dias),
    ]);

    return {
      dias,
      facturacion: facturacion.map((f) => ({
        ...f,
        cantidad_compras: Number(f.cantidad_compras),
        facturado: Number(f.facturado),
      })),
      peliculas: peliculas.map((p) => ({
        ...p,
        entradas_vendidas: Number(p.entradas_vendidas),
        facturado: Number(p.facturado),
      })),
      productos: productos.map((p) => ({
        ...p,
        unidades: Number(p.unidades),
        facturado: Number(p.facturado),
      })),
    };
  }

  private async pedir<T>(funcion: string, dias: number): Promise<T[]> {
    const { data, error } = await this.supabase.rpc(funcion, { p_dias: dias });

    if (error) throw error;
    return data as T[];
  }
}
