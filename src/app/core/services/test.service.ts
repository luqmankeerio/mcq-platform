import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Test, MCQ, TestAttempt, TestAnswer, UserProfile } from '../models';

@Injectable({ providedIn: 'root' })
export class TestService {
  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) { }

  // ─── Tests CRUD ────────────────────────────────────────────────────────────

  async getAllTests(): Promise<Test[]> {
    try {
      const { data, error } = await this.supabase
        .from('tests')
        .select('*, chapter:chapters(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Test[];
    } catch {
      // Fallback simple query
      const { data, error } = await this.supabase
        .from('tests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as Test[];
    }
  }

  async getTestsByTeacher(teacherId: string): Promise<Test[]> {
    try {
      const { data, error } = await this.supabase
        .from('tests')
        .select('*, chapter:chapters(*, subject:subjects(*))')
        .eq('created_by', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Test[];
    } catch {
      const { data, error } = await this.supabase
        .from('tests')
        .select('*, chapter:chapters(*)')
        .eq('created_by', teacherId)
        .order('created_at', { ascending: false });

      if (error) {
        const { data: simpleData, error: simpleError } = await this.supabase
          .from('tests')
          .select('*')
          .eq('created_by', teacherId)
          .order('created_at', { ascending: false });
        if (simpleError) throw new Error(simpleError.message);
        return (simpleData || []) as Test[];
      }
      return (data || []) as Test[];
    }
  }

  async getTestByToken(token: string): Promise<Test> {
    const { data: test, error: testError } = await this.supabase
      .from('tests')
      .select('*, chapter:chapters(*, subject:subjects(*))')
      .eq('invite_token', token)
      .single();

    if (testError || !test) throw new Error('Test not found or link has expired.');

    // Fetch MCQs linked to this test
    const { data: testMcqRows, error: linkError } = await this.supabase
      .from('test_mcqs')
      .select('mcq_id, order_num')
      .eq('test_id', test.id)
      .order('order_num', { ascending: true });

    if (linkError) throw new Error(linkError.message);

    const mcqIds = (testMcqRows || []).map(r => r.mcq_id);
    if (mcqIds.length === 0) {
      test.mcqs = [];
      return test as Test;
    }

    const { data: mcqs, error: mcqError } = await this.supabase
      .from('mcqs')
      .select('*, options:mcq_options(*)')
      .in('id', mcqIds);

    if (mcqError) throw new Error(mcqError.message);

    // Keep order according to test_mcqs order_num
    const mcqMap = new Map((mcqs || []).map(m => [m.id, m]));
    test.mcqs = mcqIds.map(id => mcqMap.get(id)).filter(Boolean) as MCQ[];

    return test as Test;
  }

  async createTest(
    payload: {
      title: string;
      description?: string;
      chapter_id?: number | null;
      time_limit_minutes: number;
      created_by: string;
      is_active?: boolean;
    },
    mcqIds: number[]
  ): Promise<Test> {
    // Generate secure random invite token
    const inviteToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data: test, error: testError } = await this.supabase
      .from('tests')
      .insert({
        ...payload,
        invite_token: inviteToken,
        is_active: payload.is_active ?? true
      })
      .select()
      .single();

    if (testError) throw new Error(testError.message);

    if (mcqIds && mcqIds.length > 0) {
      const rows = mcqIds.map((mcqId, index) => ({
        test_id: (test as Test).id,
        mcq_id: mcqId,
        order_num: index + 1
      }));

      const { error: linkError } = await this.supabase.from('test_mcqs').insert(rows);
      if (linkError) throw new Error(linkError.message);
    }

    return test as Test;
  }

  async updateTest(
    id: number,
    payload: Partial<Pick<Test, 'title' | 'description' | 'chapter_id' | 'time_limit_minutes' | 'is_active' | 'created_by'>>,
    mcqIds?: number[]
  ): Promise<Test> {
    const { data: test, error: testError } = await this.supabase
      .from('tests')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (testError) throw new Error(testError.message);

    if (mcqIds !== undefined) {
      // Re-assign test MCQs
      await this.supabase.from('test_mcqs').delete().eq('test_id', id);
      if (mcqIds.length > 0) {
        const rows = mcqIds.map((mcqId, index) => ({
          test_id: id,
          mcq_id: mcqId,
          order_num: index + 1
        }));
        const { error: linkError } = await this.supabase.from('test_mcqs').insert(rows);
        if (linkError) throw new Error(linkError.message);
      }
    }

    return test as Test;
  }

  async deleteTest(id: number): Promise<void> {
    const { error } = await this.supabase.from('tests').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── Invitations ───────────────────────────────────────────────────────────

  async isStudentInvited(testId: number, studentId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('test_invitations')
      .select('id')
      .eq('test_id', testId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return !!data;
  }

  async getInvitedStudents(testId: number): Promise<UserProfile[]> {
    const { data, error } = await this.supabase
      .from('test_invitations')
      .select('student_id, student:profiles(*)')
      .eq('test_id', testId);

    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => row.student).filter(Boolean);
  }

  async inviteStudentToTest(testId: number, studentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('test_invitations')
      .insert({ test_id: testId, student_id: studentId });

    if (error && error.code !== '23505') { // ignore duplicate unique constraint
      throw new Error(error.message);
    }
  }

  async removeInvitation(testId: number, studentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('test_invitations')
      .delete()
      .eq('test_id', testId)
      .eq('student_id', studentId);

    if (error) throw new Error(error.message);
  }

  // ─── Test Attempts & Automatic Submission ──────────────────────────────────

  async startAttempt(testId: number, studentId: string): Promise<TestAttempt> {
    // Check if there is already an unsubmitted attempt
    const { data: existing } = await this.supabase
      .from('test_attempts')
      .select('*')
      .eq('test_id', testId)
      .eq('student_id', studentId)
      .eq('is_submitted', false)
      .order('started_at', { ascending: false })
      .maybeSingle();

    if (existing) {
      return existing as TestAttempt;
    }

    // Get total questions count for the test
    const { count } = await this.supabase
      .from('test_mcqs')
      .select('*', { count: 'exact', head: true })
      .eq('test_id', testId);

    const { data, error } = await this.supabase
      .from('test_attempts')
      .insert({
        test_id: testId,
        student_id: studentId,
        total_questions: count || 0,
        score: 0,
        is_submitted: false
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as TestAttempt;
  }

  async submitAttempt(
    attemptId: number,
    answers: { mcq_id: number; selected_option_id: number | null }[]
  ): Promise<TestAttempt> {
    let score = 0;

    // Check correctness for each answered option
    const optionIds = answers
      .map(a => a.selected_option_id)
      .filter((id): id is number => typeof id === 'number');

    let correctOptionIds = new Set<number>();

    if (optionIds.length > 0) {
      const { data: optionsData, error: optError } = await this.supabase
        .from('mcq_options')
        .select('id, is_correct')
        .in('id', optionIds);

      if (optError) throw new Error(optError.message);
      correctOptionIds = new Set(
        (optionsData || []).filter(o => o.is_correct).map(o => o.id)
      );
    }

    const answerRows = answers.map(ans => {
      const isCorrect = ans.selected_option_id ? correctOptionIds.has(ans.selected_option_id) : false;
      if (isCorrect) score++;
      return {
        attempt_id: attemptId,
        mcq_id: ans.mcq_id,
        selected_option_id: ans.selected_option_id,
        is_correct: isCorrect
      };
    });

    // Delete previous answers if any, then insert
    await this.supabase.from('test_answers').delete().eq('attempt_id', attemptId);
    if (answerRows.length > 0) {
      const { error: ansInsertError } = await this.supabase
        .from('test_answers')
        .insert(answerRows);
      if (ansInsertError) throw new Error(ansInsertError.message);
    }

    // Update attempt
    const { data: attempt, error: updateError } = await this.supabase
      .from('test_attempts')
      .update({
        score,
        total_questions: answers.length,
        submitted_at: new Date().toISOString(),
        is_submitted: true
      })
      .eq('id', attemptId)
      .select('*, test:tests(*)')
      .single();

    if (updateError) throw new Error(updateError.message);
    return attempt as TestAttempt;
  }

  async getAttemptsByStudent(studentId: string): Promise<TestAttempt[]> {
    const { data, error } = await this.supabase
      .from('test_attempts')
      .select('*, test:tests(*, chapter:chapters(*, subject:subjects(*)))')
      .eq('student_id', studentId)
      .eq('is_submitted', true)
      .order('submitted_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as TestAttempt[];
  }

  async getAttemptsByTest(testId: number): Promise<TestAttempt[]> {
    const { data, error } = await this.supabase
      .from('test_attempts')
      .select('*, student:profiles(*)')
      .eq('test_id', testId)
      .eq('is_submitted', true)
      .order('score', { ascending: false });

    if (error) throw new Error(error.message);
    return data as TestAttempt[];
  }

  async getAttemptById(attemptId: number): Promise<TestAttempt> {
    const { data: attempt, error: attemptError } = await this.supabase
      .from('test_attempts')
      .select('*, test:tests(*)')
      .eq('id', attemptId)
      .single();

    if (attemptError) throw new Error(attemptError.message);

    const { data: answers, error: answersError } = await this.supabase
      .from('test_answers')
      .select(`
        *,
        mcq:mcqs(*, options:mcq_options(*)),
        selected_option:mcq_options(*)
      `)
      .eq('attempt_id', attemptId);

    if (answersError) throw new Error(answersError.message);

    attempt.answers = answers;
    return attempt as TestAttempt;
  }
}

