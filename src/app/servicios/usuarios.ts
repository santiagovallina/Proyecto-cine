import { inject, Service } from '@angular/core';
import { Rol } from '../modelos/perfil';
import { Usuario } from '../modelos/usuario';
import { Supabase } from './supabase';

// Gestión de roles para el panel de admin. Las funciones SQL comprueban que quien llama sea admin.
@Service()
export class Usuarios {
  private supabase = inject(Supabase).client;

  // Solo los empleados y admins: no hace falta traer a todos los clientes.
  async listarPersonal(): Promise<Usuario[]> {
    const { data, error } = await this.supabase.rpc('listar_personal');

    if (error) throw error;
    return data as Usuario[];
  }

  // SQL busca el email exacto y falla si no existe: la validación se hace al enviar.
  async cambiarRol(email: string, rol: Rol): Promise<void> {
    const { error } = await this.supabase.rpc('cambiar_rol', { p_email: email, p_rol: rol });

    if (error) throw error;
  }
}
