import { Component, inject, signal } from '@angular/core';
import { form, FormField, email, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { LoginData } from '../../modelos/login-data';
import { Auth } from '../../servicios/auth';

@Component({
  imports: [FormField, RouterLink],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private auth = inject(Auth);
  private router = inject(Router);

  loginModel = signal<LoginData>({
    email: '',
    password: '',
  });

  loginForm = form(this.loginModel, (campos) => {
    required(campos.email, { message: 'El email es obligatorio' });
    email(campos.email, { message: 'Ingresá un email válido' });
    required(campos.password, { message: 'La contraseña es obligatoria' });
  });

  errorServidor = signal<string | null>(null);

  enviar(evento: Event) {
    evento.preventDefault();
    this.errorServidor.set(null);

    submit(this.loginForm, async () => {
      const datos = this.loginModel();
      const { data, error } = await this.auth.ingresar(datos.email, datos.password);

      if (error || !data.user) {
        this.errorServidor.set('Email o contraseña incorrectos');
        return;
      }

      const rol = await this.auth.obtenerRol(data.user.id);

      if (rol === 'admin') {
        this.router.navigate(['/admin']);
      } else if (rol === 'empleado') {
        this.router.navigate(['/empleado']);
      } else {
        this.router.navigate(['/']);
      }
    });
  }
}
