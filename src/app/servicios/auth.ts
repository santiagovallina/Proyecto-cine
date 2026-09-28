import { computed, inject, Service, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { Perfil } from '../modelos/perfil';
import { RegistroData } from '../modelos/registro-data';
import { Supabase } from './supabase';

@Service()
export class Auth {
  private supabase = inject(Supabase).client;

  usuario = signal<User | null>(null);
  perfil = signal<Perfil | null>(null);
  cargando = signal(true);

  logueado = computed(() => this.usuario() !== null);
  rol = computed(() => this.perfil()?.rol ?? null);

  constructor() {
    this.supabase.auth.onAuthStateChange((_evento, sesion) => {
      this.usuario.set(sesion?.user ?? null);

      if (sesion?.user) {
        setTimeout(() => this.cargarPerfil(sesion.user.id), 0);
      } else {
        this.perfil.set(null);
        this.cargando.set(false);
      }
    });
  }

  private async cargarPerfil(id: string) {
    const { data } = await this.supabase.from('perfiles').select('*').eq('id', id).single();
    this.perfil.set(data as Perfil | null);
    this.cargando.set(false);
  }

  registrar(datos: RegistroData) {
    return this.supabase.auth.signUp({
      email: datos.email,
      password: datos.password,
      options: {
        data: {
          nombre: datos.nombre,
          apellido: datos.apellido,
          fecha_nacimiento: datos.fecha_nacimiento,
          tipo_sangre: datos.tipo_sangre,
          color_ojos: datos.color_ojos,
          dias_vacaciones: datos.dias_vacaciones,
        },
      },
    });
  }

  ingresar(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  salir() {
    return this.supabase.auth.signOut();
  }
}
