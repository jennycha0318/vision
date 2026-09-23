// 서버 전용. 로그인한 사용자만 Claude API를 쓰게 해서 남이 비용을 쓰지 못하게 한다.
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** 통과하면 null, 막아야 하면 401 응답을 돌려준다. Supabase 설정이 없으면(로컬 개발) 통과. */
export async function requireUser(request: Request): Promise<Response | null> {
  if (!url || !key) return null;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: '로그인이 필요해요' }, { status: 401 });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: '로그인이 만료됐어요' }, { status: 401 });
  return null;
}
