import { supabase } from './supabase';
import { EMPTY_STATE, type AppState, type DayRecord, type Entry, type Profile, type Vision } from './types';

// Supabase 테이블 ↔ 앱 상태 변환. 스키마: supabase/migrations/*_init.sql

function db() {
  if (!supabase) throw new Error('Supabase가 설정되지 않았어요');
  return supabase;
}

function fail(error: { message: string } | null, what: string) {
  if (error) throw new Error(`${what}: ${error.message}`);
}

export async function loadRemoteState(userId: string): Promise<AppState> {
  const [profile, vision, entries, rests] = await Promise.all([
    db().from('profiles').select('age_group, gender').eq('user_id', userId).maybeSingle(),
    db().from('visions').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db().from('entries').select('id, date, kind, text, created_at').eq('user_id', userId).order('created_at'),
    db().from('rest_days').select('date').eq('user_id', userId),
  ]);
  fail(profile.error, '프로필 불러오기');
  fail(vision.error, '비전 불러오기');
  fail(entries.error, '기록 불러오기');
  fail(rests.error, '쉬어간 날 불러오기');

  const days: Record<string, DayRecord> = {};
  const dayOf = (date: string) => (days[date] ??= { date, gratitudes: [], actions: [], restedAction: false });
  for (const row of entries.data ?? []) {
    const entry: Entry = { id: row.id, text: row.text, at: new Date(row.created_at).getTime() };
    (row.kind === 'gratitude' ? dayOf(row.date).gratitudes : dayOf(row.date).actions).push(entry);
  }
  for (const row of rests.data ?? []) dayOf(row.date).restedAction = true;

  const v = vision.data;
  return {
    ...EMPTY_STATE,
    profile: profile.data ? { ageGroup: profile.data.age_group, gender: profile.data.gender } : null,
    vision: v
      ? {
          id: v.id,
          startDate: v.start_date,
          answers: v.answers,
          summary: v.summary,
          imagePrompt: v.image_prompt,
          imageFile: v.image_file,
          imageWidth: v.image_width,
          imageHeight: v.image_height,
        }
      : null,
    days,
  };
}

export async function saveProfile(userId: string, profile: Profile) {
  const { error } = await db()
    .from('profiles')
    .upsert({ user_id: userId, age_group: profile.ageGroup, gender: profile.gender, updated_at: new Date().toISOString() });
  fail(error, '프로필 저장');
}

export async function saveVision(userId: string, vision: Vision) {
  const off = await db().from('visions').update({ is_active: false }).eq('user_id', userId).eq('is_active', true);
  fail(off.error, '이전 비전 정리');
  const { error } = await db().from('visions').insert({
    id: vision.id,
    user_id: userId,
    start_date: vision.startDate,
    answers: vision.answers,
    summary: vision.summary,
    image_prompt: vision.imagePrompt,
    image_file: vision.imageFile,
    image_width: vision.imageWidth,
    image_height: vision.imageHeight,
    is_active: true,
  });
  fail(error, '비전 저장');
}

export async function saveDayAdditions(
  userId: string,
  date: string,
  added: { gratitudes: Entry[]; actions: Entry[]; rested: boolean },
) {
  const rows = [
    ...added.gratitudes.map((e) => ({ id: e.id, user_id: userId, date, kind: 'gratitude', text: e.text, created_at: new Date(e.at).toISOString() })),
    ...added.actions.map((e) => ({ id: e.id, user_id: userId, date, kind: 'action', text: e.text, created_at: new Date(e.at).toISOString() })),
  ];
  if (rows.length) fail((await db().from('entries').insert(rows)).error, '기록 저장');
  if (added.rested) fail((await db().from('rest_days').upsert({ user_id: userId, date })).error, '쉬어간 날 저장');
}

export async function deleteAllRemote(userId: string) {
  for (const table of ['entries', 'rest_days', 'visions', 'profiles'] as const) {
    fail((await db().from(table).delete().eq('user_id', userId)).error, `${table} 삭제`);
  }
}
