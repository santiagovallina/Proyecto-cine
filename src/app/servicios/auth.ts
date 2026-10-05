import { computed, inject, Service, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { User } from '@supabase/supabase-js';
import { filter, firstValueFrom, take } from 'rxjs';
import { Perfil, Rol } from '../modelos/perfil';
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

  private cargando$ = toObservable(this.cargando);

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

  /** Se resuelve apenas termina de saberse si hay sesión (y, si la hay, su perfil). */
  listo(): Promise<void> {
    return firstValueFrom(this.cargando$.pipe(filter((cargando) => !cargando), take(1))).then(
      () => undefined,
    );
  }

  /**
   * Pide el rol directo a la base, sin depender de que el oyente global
   * ya haya terminado de cargar el perfil (evita la carrera justo después
   * de un login recién hecho).
   */
  async obtenerRol(id: string): Promise<Rol | null> {
    const { data } = await this.supabase.from('perfiles').select('rol').eq('id', id).single();
    return (data as { rol: Rol } | null)?.rol ?? null;
  }

  /**
   * Rol del usuario con sesión, leído siempre de la base. Lo usan los Guards: así no dependen
   * de si el perfil global ya terminó de cargarse ni de un perfil viejo en memoria.
   */
  async rolActual(): Promise<Rol | null> {
    const usuario = this.usuario();
    return usuario ? this.obtenerRol(usuario.id) : null;
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
