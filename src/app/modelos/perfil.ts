export type Rol = 'cliente' | 'admin' | 'empleado';

export interface Perfil {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  tipo_sangre: string | null;
  color_ojos: string | null;
  dias_vacaciones: number | null;
  rol: Rol;
}
