import { accessToken } from './supabase';
import { FALLBACK_ACTIONS, templateVision, type VisionDraft } from './templates';
import type { Profile } from './types';

// 웹은 같은 도메인의 API 라우트를 쓴다. 네이티브 앱은 배포된 서버 주소가 필요하다.
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

export type Drafted = VisionDraft & { source: 'ai' | 'template' };

async function post<T>(path: string, body: unknown): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export async function draftVision(answers: string[], profile: Profile): Promise<Drafted> {
  try {
    return await post<Drafted>('/api/vision', { answers, profile });
  } catch (e) {
    console.warn('비전 프롬프트 요청 실패, 템플릿 사용', e);
    return { ...templateVision(answers, profile), source: 'template' };
  }
}

export async function suggestActions(vision: { summary: string; answers: string[] }, recent: string[]): Promise<string[]> {
  try {
    const { actions } = await post<{ actions: string[] }>('/api/suggest', {
      vision: { summary: vision.summary, answers: vision.answers },
      recent,
    });
    return actions;
  } catch (e) {
    console.warn('행동 제안 요청 실패, 기본 제안 사용', e);
    return FALLBACK_ACTIONS;
  }
}
