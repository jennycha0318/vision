import { aiConfigured, suggestActions } from '@/server/claude';
import { FALLBACK_ACTIONS } from '@/lib/templates';

export async function POST(request: Request) {
  const { vision, recent } = await request.json();
  if (!vision?.summary) {
    return Response.json({ error: 'vision이 필요해요' }, { status: 400 });
  }

  if (aiConfigured()) {
    try {
      const actions = await suggestActions(vision, Array.isArray(recent) ? recent.slice(0, 10) : []);
      if (actions?.length) return Response.json({ actions, source: 'ai' });
    } catch (e) {
      console.error('suggestActions 실패', e);
    }
  }
  return Response.json({ actions: FALLBACK_ACTIONS, source: 'template' });
}
