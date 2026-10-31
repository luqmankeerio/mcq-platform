import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  /** Raw Supabase client (use sparingly – prefer typed helpers below) */
  get client(): SupabaseClient {
    return this.supabase;
  }

  /** Auth namespace */
  get auth() {
    return this.supabase.auth;
  }

  /** Storage namespace */
  get storage() {
    return this.supabase.storage;
  }

  /** Typed table query builder */
  from(table: string) {
    return this.supabase.from(table);
  }

  /** Storage bucket helper */
  bucket(name: string) {
    return this.supabase.storage.from(name);
  }
}
