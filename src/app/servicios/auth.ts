import { inject, Service } from '@angular/core';
import { Supabase } from './supabase';

@Service()
export class Auth {
  private supabase = inject(Supabase).client;
}
