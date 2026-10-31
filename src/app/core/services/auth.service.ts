import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { UserProfile } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {

  private readonly _currentUser$ = new BehaviorSubject<UserProfile | null>(null);
  readonly currentUser$: Observable<UserProfile | null> = this._currentUser$.asObservable();

  private authSubscription?: Subscription;

  constructor(private supabase: SupabaseService) {
    // Listen for auth state changes (login, logout, token refresh)
    this.supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          this.loadUserProfile(session.user.id);
        } else {
          this._currentUser$.next(null);
        }
      }
    );

    // Restore session on app boot
    this.restoreSession();
  }

  // ─── Session Restore ───────────────────────────────────────────────────────

  private async restoreSession(): Promise<void> {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session?.user) {
      await this.loadUserProfile(session.user.id);
    }
  }

  // ─── Profile Loader ────────────────────────────────────────────────────────

  async loadUserProfile(userId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[AuthService] loadUserProfile error:', error.message);
      this._currentUser$.next(null);
      return;
    }

    this._currentUser$.next(data as UserProfile);
  }

  // ─── Sign In ───────────────────────────────────────────────────────────────

  async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      await this.loadUserProfile(data.user.id);
    }

    return { error: null };
  }

  // ─── Sign Up ───────────────────────────────────────────────────────────────

  async signUp(
    email: string,
    password: string,
    fullName: string,
    phone?: string
  ): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
          role: 'student'
        }
      }
    });

    if (error) {
      return { error: error.message };
    }

    if (!data.user) {
      return { error: 'Sign-up succeeded but no user returned. Check your email for confirmation.' };
    }

    // Upsert profile row (handles both new + already-existing via email confirmation flow)
    const { error: profileError } = await this.supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: 'student',
        phone: phone ?? null
      });

    if (profileError) {
      console.warn('[AuthService] profile upsert warning (trigger may have already inserted it):', profileError.message);
    }

    await this.loadUserProfile(data.user.id);
    return { error: null };
  }

  // ─── Sign Out ──────────────────────────────────────────────────────────────

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this._currentUser$.next(null);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  getCurrentUser(): Observable<UserProfile | null> {
    return this.currentUser$;
  }

  get currentUserSnapshot(): UserProfile | null {
    return this._currentUser$.value;
  }

  isAdmin(): boolean {
    return this._currentUser$.value?.role === 'admin';
  }

  isTeacher(): boolean {
    return this._currentUser$.value?.role === 'teacher';
  }

  isStudent(): boolean {
    return this._currentUser$.value?.role === 'student';
  }

  isAuthenticated(): boolean {
    return this._currentUser$.value !== null;
  }

  /**
   * Returns the current Supabase session.
   * Use this to get the raw JWT when you need to ensure auth is ready
   * before making RLS-protected queries.
   */
  async getSession() {
    return this.supabase.auth.getSession();
  }

  // ─── Password Reset ────────────────────────────────────────────────────────

  async sendPasswordResetEmail(email: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { error: error?.message ?? null };
  }

  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }
}
