import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Class, Subject, Chapter, MCQ, MCQOption } from '../models';

@Injectable({ providedIn: 'root' })
export class McqService {

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {}

  // ─── Classes ───────────────────────────────────────────────────────────────

  async getClasses(): Promise<Class[]> {
    const { data, error } = await this.supabase
      .from('classes')
      .select('*')
      .order('name');

    if (error) throw new Error(error.message);
    return data as Class[];
  }

  async createClass(payload: Pick<Class, 'name' | 'description'>): Promise<Class> {
    const { data, error } = await this.supabase
      .from('classes')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Class;
  }

  async updateClass(id: number, payload: Partial<Pick<Class, 'name' | 'description'>>): Promise<Class> {
    const { data, error } = await this.supabase
      .from('classes')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Class;
  }

  async deleteClass(id: number): Promise<void> {
    const { error } = await this.supabase.from('classes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── Subjects ──────────────────────────────────────────────────────────────

  async getAllSubjects(): Promise<Subject[]> {
    try {
      const { data, error } = await this.supabase
        .from('subjects')
        .select('*, class:classes(*)')
        .order('class_id')
        .order('name');
      if (error) throw error;
      return (data || []) as Subject[];
    } catch {
      // Fallback without join in case PostgREST schema cache relationship fails
      const { data, error } = await this.supabase
        .from('subjects')
        .select('*')
        .order('class_id')
        .order('name');
      if (error) throw new Error(error.message);
      return (data || []) as Subject[];
    }
  }

  async getAllChapters(): Promise<Chapter[]> {
    try {
      const { data, error } = await this.supabase
        .from('chapters')
        .select('*')
        .order('subject_id')
        .order('order_num');
      if (error) throw error;
      return (data || []) as Chapter[];
    } catch (err: any) {
      throw new Error(err.message || 'Failed to fetch chapters');
    }
  }

  async getSubjectsByClass(classId: number): Promise<Subject[]> {
    const { data, error } = await this.supabase
      .from('subjects')
      .select('*, class:classes(*)')
      .eq('class_id', classId)
      .order('name');

    if (error) throw new Error(error.message);
    return data as Subject[];
  }

  async createSubject(payload: Pick<Subject, 'class_id' | 'name' | 'description' | 'icon'>): Promise<Subject> {
    const { data, error } = await this.supabase
      .from('subjects')
      .insert(payload)
      .select('*, class:classes(*)')
      .single();

    if (error) throw new Error(error.message);
    return data as Subject;
  }

  async updateSubject(id: number, payload: Partial<Pick<Subject, 'name' | 'description' | 'icon'>>): Promise<Subject> {
    const { data, error } = await this.supabase
      .from('subjects')
      .update(payload)
      .eq('id', id)
      .select('*, class:classes(*)')
      .single();

    if (error) throw new Error(error.message);
    return data as Subject;
  }

  async deleteSubject(id: number): Promise<void> {
    const { error } = await this.supabase.from('subjects').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── Chapters ──────────────────────────────────────────────────────────────

  async getChaptersBySubject(subjectId: number): Promise<Chapter[]> {
    const { data, error } = await this.supabase
      .from('chapters')
      .select('*, subject:subjects(*)')
      .eq('subject_id', subjectId)
      .order('order_num');

    if (error) throw new Error(error.message);
    return data as Chapter[];
  }

  async createChapter(payload: Pick<Chapter, 'subject_id' | 'name' | 'description' | 'order_num'>): Promise<Chapter> {
    const { data, error } = await this.supabase
      .from('chapters')
      .insert(payload)
      .select('*, subject:subjects(*)')
      .single();

    if (error) throw new Error(error.message);
    return data as Chapter;
  }

  async updateChapter(id: number, payload: Partial<Pick<Chapter, 'name' | 'description' | 'order_num'>>): Promise<Chapter> {
    const { data, error } = await this.supabase
      .from('chapters')
      .update(payload)
      .eq('id', id)
      .select('*, subject:subjects(*)')
      .single();

    if (error) throw new Error(error.message);
    return data as Chapter;
  }

  async deleteChapter(id: number): Promise<void> {
    const { error } = await this.supabase.from('chapters').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── MCQs ──────────────────────────────────────────────────────────────────

  async getMCQsByChapter(chapterId: number): Promise<MCQ[]> {
    const { data, error } = await this.supabase
      .from('mcqs')
      .select(`
        *,
        chapter:chapters(*),
        options:mcq_options(*)
      `)
      .eq('chapter_id', chapterId)
      .order('created_at');

    if (error) throw new Error(error.message);
    return data as MCQ[];
  }

  async getMCQById(id: number): Promise<MCQ> {
    const { data, error } = await this.supabase
      .from('mcqs')
      .select(`
        *,
        chapter:chapters(*, subject:subjects(*)),
        options:mcq_options(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as MCQ;
  }

  async createMCQ(
    mcqPayload: Pick<MCQ, 'chapter_id' | 'question_text' | 'difficulty' | 'explanation' | 'image_url'>,
    options: Pick<MCQOption, 'option_label' | 'option_text' | 'is_correct'>[]
  ): Promise<MCQ> {
    const userId = this.auth.currentUserSnapshot?.id;
    if (!userId) throw new Error('Not authenticated');

    // Insert the MCQ
    const { data: mcq, error: mcqError } = await this.supabase
      .from('mcqs')
      .insert({ ...mcqPayload, created_by: userId })
      .select()
      .single();

    if (mcqError) throw new Error(mcqError.message);

    // Insert the options
    const optionRows = options.map(opt => ({ ...opt, mcq_id: (mcq as MCQ).id }));
    const { error: optError } = await this.supabase.from('mcq_options').insert(optionRows);
    if (optError) throw new Error(optError.message);

    return this.getMCQById((mcq as MCQ).id);
  }

  async updateMCQ(
    id: number,
    mcqPayload: Partial<Pick<MCQ, 'question_text' | 'difficulty' | 'explanation' | 'image_url'>>,
    options?: Pick<MCQOption, 'option_label' | 'option_text' | 'is_correct'>[]
  ): Promise<MCQ> {
    // Update MCQ fields
    const { error: mcqError } = await this.supabase
      .from('mcqs')
      .update(mcqPayload)
      .eq('id', id);

    if (mcqError) throw new Error(mcqError.message);

    if (options && options.length > 0) {
      // Delete existing options then re-insert
      const { error: delError } = await this.supabase.from('mcq_options').delete().eq('mcq_id', id);
      if (delError) throw new Error(delError.message);

      const optionRows = options.map(opt => ({ ...opt, mcq_id: id }));
      const { error: optError } = await this.supabase.from('mcq_options').insert(optionRows);
      if (optError) throw new Error(optError.message);
    }

    return this.getMCQById(id);
  }

  async deleteMCQ(id: number): Promise<void> {
    // Options are cascade-deleted by FK in the DB
    const { error } = await this.supabase.from('mcqs').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── Image Upload ──────────────────────────────────────────────────────────

  async uploadImage(file: File, path: string): Promise<string> {
    const { data, error } = await this.supabase.bucket('mcq-images').upload(path, file, {
      cacheControl: '3600',
      upsert: true
    });

    if (error) throw new Error(error.message);

    const { data: urlData } = this.supabase.bucket('mcq-images').getPublicUrl(data.path);
    return urlData.publicUrl;
  }
}
