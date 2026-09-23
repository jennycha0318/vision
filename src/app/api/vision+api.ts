import { aiConfigured, draftVision } from '@/server/claude';
import { templateVision } from '@/lib/templates';

export async function POST(request: Request) {
  const { answers, profile } = await request.json();
  if (!Array.isArray(answers) || !profile) {
    return Response.json({ error: 'answers와 profile이 필요해요' }, { status: 400 });
  }

  if (aiConfigured()) {
    try {
      const draft = await draftVision(answers, profile);
      if (draft) return Response.json({ ...draft, source: 'ai' });
    } catch (e) {
      console.error('draftVision 실패', e);
    }
  }
  return Response.json({ ...templateVision(answers, profile), source: 'template' });
}
