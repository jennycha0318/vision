import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Supabase의 publishable(또는 anon) 키. 공개돼도 되는 키이며, 데이터는 RLS로 보호된다
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// 서버 사전 렌더링(Node) 중에는 브라우저 저장소가 없다
const isBrowserLike = typeof window !== 'undefined';

/** Supabase 설정이 없으면 null — 로컬 전용 모드로 동작한다 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: isBrowserLike ? AsyncStorage : undefined,
          persistSession: isBrowserLike,
          autoRefreshToken: isBrowserLike,
          detectSessionInUrl: false,
        },
      })
    : null;

export const IMAGE_BUCKET = 'vision-images';

/** API 라우트 호출에 붙일 로그인 토큰 */
export async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
