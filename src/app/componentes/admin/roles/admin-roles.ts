import { Component, inject, OnInit, signal } from '@angular/core';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { Rol } from '../../../modelos/perfil';
import { Usuario } from '../../../modelos/usuario';
import { Auth } from '../../../servicios/auth';
import { Usuarios } from '../../../servicios/usuarios';
import { Spinner } from '../../spinner/spinner';

interface CambioRolForm {
  email: string;
  rol: Rol;
}

@Component({
  imports: [FormField, Spinner],
  selector: 'app-admin-roles',
  styleUrls: ['../admin-compartido.css', './admin-roles.css'],
  templateUrl: './admin-roles.html',
})
export class AdminRoles implements OnInit {
  private usuariosService = inject(Usuarios);

  auth = inject(Auth);

  readonly roles: { valor: Rol; nombre: string }[] = [
    { valor: 'cliente', nombre: 'Cliente (sin permisos especiales)' },
    { valor: 'empleado', nombre: 'Empleado (valida entradas)' },
    { valor: 'admin', nombre: 'Administrador (control total)' },
  ];

  personal = signal<Usuario[]>([]);
  cargando = signal(true);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  cambioModel = signal<CambioRolForm>({ email: '', rol: 'empleado' });

  cambioForm = form(this.cambioModel, (campos) => {
    required(campos.email, { message: 'Ingresá el email del usuario' });
    email(campos.email, { message: 'Ingresá un email válido' });
    required(campos.rol, { message: 'Elegí un rol' });
  });

  async ngOnInit() {
    await this.cargarPersonal();
  }

  // El email tiene que existir: lo comprueba SQL recién al enviar, no mientras se escribe.
  enviar(evento: Event) {
    evento.preventDefault();
    this.mensaje.set(null);
    this.error.set(null);

    submit(this.cambioForm, async () => {
      const datos = this.cambioModel();
      await this.asignar(datos.email.trim(), datos.rol);
    });
  }

  // Atajo de la lista de personal: vuelve a un empleado o admin a cliente.
  quitarRol(usuario: Usuario) {
    this.mensaje.set(null);
    this.error.set(null);
    return this.asignar(usuario.email, 'cliente');
  }

  private async asignar(emailUsuario: string, rol: Rol) {
    try {
      await this.usuariosService.cambiarRol(emailUsuario, rol);
      this.mensaje.set(`Ahora ${emailUsuario} tiene el rol "${rol}".`);
      await this.cargarPersonal();
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'No se pudo cambiar el rol.');
    }
  }

  private async cargarPersonal() {
    this.cargando.set(true);
    try {
      this.personal.set(await this.usuariosService.listarPersonal());
    } catch {
      this.error.set('No se pudo cargar la lista del personal.');
    } finally {
      this.cargando.set(false);
    }
  }
}
