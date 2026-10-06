// Filas que devuelven las funciones SQL de reportes (solo admin).
export interface FilaFacturacion {
  dia: string;
  cantidad_compras: number;
  facturado: number;
}

export interface FilaPelicula {
  nombre_pelicula: string;
  entradas_vendidas: number;
  facturado: number;
}

export interface FilaProducto {
  nombre_producto: string;
  unidades: number;
  facturado: number;
}

export interface DatosReporte {
  dias: number;
  facturacion: FilaFacturacion[];
  peliculas: FilaPelicula[];
  productos: FilaProducto[];
}
