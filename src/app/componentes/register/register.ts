import { Component, inject, signal } from '@angular/core';
import { form, FormField, email, max, min, minLength, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { RegistroData } from '../../modelos/registro-data';
import { Auth } from '../../servicios/auth';

function fechaDeHoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

@Component({
  imports: [FormField, RouterLink],
  selector: 'app-register',
  styleUrl: './register.css',
  templateUrl: './register.html',
})
export class Register {
  private auth = inject(Auth);
  private router = inject(Router);

  readonly tiposSangre = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly coloresOjos = ['Marrones', 'Negros', 'Azules', 'Verdes', 'Grises', 'Avellana'];
  readonly hoy = fechaDeHoy();

  registroModel = signal<RegistroData>({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    fecha_nacimiento: '',
    tipo_sangre: '',
    color_ojos: '',
    dias_vacaciones: 0,
  });

  registroForm = form(this.registroModel, (campos) => {
    required(campos.email, { message: 'El email es obligatorio' });
    email(campos.email, { message: 'Ingresá un email válido' });

    required(campos.password, { message: 'La contraseña es obligatoria' });
    minLength(campos.password, 6, { message: 'La contraseña debe tener al menos 6 caracteres' });

    required(campos.nombre, { message: 'El nombre es obligatorio' });
    required(campos.apellido, { message: 'El apellido es obligatorio' });

    required(campos.fecha_nacimiento, { message: 'La fecha de nacimiento es obligatoria' });
    validate(campos.fecha_nacimiento, ({ value }) =>
      value() > fechaDeHoy()
        ? { kind: 'fechaFutura', message: 'La fecha no puede ser futura' }
        : undefined,
    );

    required(campos.tipo_sangre, { message: 'Elegí tu tipo de sangre' });
    required(campos.color_ojos, { message: 'Elegí el color de tus ojos' });

    min(campos.dias_vacaciones, 0, { message: 'No puede ser negativo' });
    max(campos.dias_vacaciones, 365, { message: 'No puede superar 365 días' });
  });

  errorServidor = signal<string | null>(null);

  enviar(evento: Event) {
    evento.preventDefault();
    this.errorServidor.set(null);

    submit(this.registroForm, async () => {
      const { error } = await this.auth.registrar(this.registroModel());

      if (error) {
        this.errorServidor.set(error.message);
        return;
      }

      this.router.navigate(['/cartelera']);
    });
  }
}
