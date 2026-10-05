import { Rol } from './perfil';

// Lo que devuelve la función SQL listar_usuarios() (solo para admins).
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
}
