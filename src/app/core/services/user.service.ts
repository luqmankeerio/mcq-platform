import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserProfile } from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private supabase: SupabaseService) {}

  async getAllUsers(): Promise<UserProfile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as UserProfile[];
  }

  async getAllStudents(): Promise<UserProfile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('full_name');

    if (error) throw new Error(error.message);
    return data as UserProfile[];
  }

  async getAllTeachers(): Promise<UserProfile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'teacher')
      .order('full_name');

    if (error) throw new Error(error.message);
    return data as UserProfile[];
  }

  async getUserById(id: string): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as UserProfile;
  }

  async updateUser(id: string, payload: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as UserProfile;
  }

  async changeUserRole(id: string, role: 'admin' | 'teacher' | 'student'): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ role })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
}

