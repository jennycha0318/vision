// 서버 전용 (API 라우트에서만 import). API 키는 브라우저·앱 번들에 절대 들어가지 않는다.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

import { VISION_QUESTIONS } from '@/lib/questions';
import type { VisionDraft } from '@/lib/templates';
import type { Profile } from '@/lib/types';

const MODEL = 'claude-opus-5';

export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

/** 거절 시 서버가 알아서 다른 모델로 다시 시도하도록 한다 */
const FALLBACK: { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: 'default' } = {
  betas: ['server-side-fallback-2026-07-01'],
  fallbacks: 'default',
};

// ───────────── 비전 → 이미지 프롬프트 ─────────────

const VisionSchema = z.object({
  summary: z.string().describe('비전을 담은 한국어 한 문장. 현재형, 40자 안팎.'),
  imagePrompt: z.string().describe('ChatGPT 이미지 생성에 넣을 영어 프롬프트'),
});

const VISION_SYSTEM = `당신은 사용자가 이루고 싶은 미래 장면을 한 장의 그림으로 만드는 프롬프트를 쓴다.
사용자는 이 그림을 한 달 넘게 매일 보며 흑백에서 컬러로 채워 나간다. 잘 나온 한 장보다 질리지 않는 한 장이 중요하다.
프롬프트는 ChatGPT 이미지 생성에 그대로 붙여넣어 쓴다.

프롬프트 규칙:
- 얼굴을 그리지 않는다. 주인공은 뒷모습, 측면, 또는 얼굴 디테일이 드러나지 않는 구도로 둔다. 다른 인물도 얼굴 디테일을 최소화한다.
- 시선 방향을 명시한다 (누가 누구를, 또는 무엇을 보는지). 모두가 카메라를 보며 웃는 스톡 사진처럼 되면 안 된다.
- 사용자가 말한 구체적인 디테일(공간, 사물, 분위기)을 빠짐없이 살린다. 그것이 "내 장면"처럼 느끼게 만든다.
- 스타일: 채도가 높고 구도가 단순한 수채화풍 일러스트. 흑백에서 색이 차오를 때 극적으로 보여야 한다. 복잡한 사진풍은 피한다.
- 주인공의 나이대와 성별을 반영한다.
- 세로 3:4 비율 한 장. 글자, 로고, 워터마크는 넣지 않는다.`;

export async function draftVision(answers: string[], profile: Profile): Promise<VisionDraft | null> {
  const qa = VISION_QUESTIONS.map((q, i) => `Q${i + 1}. ${q.title}\nA. ${answers[i]?.trim() || '(답 없음)'}`).join('\n\n');
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    system: VISION_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `주인공: ${profile.ageGroup} ${profile.gender === '밝히지 않음' ? '' : profile.gender}\n\n${qa}`,
      },
    ],
    output_config: { effort: 'medium', format: betaZodOutputFormat(VisionSchema) },
  });

  if (response.stop_reason === 'refusal') return null;
  return response.parsed_output ?? null;
}

// ───────────── 오늘의 작은 행동 제안 ─────────────

const ActionsSchema = z.object({
  actions: z.array(z.string()).describe('오늘 할 수 있는 작은 행동 3개'),
});

export async function suggestActions(
  vision: { summary: string; answers: string[] },
  recent: string[],
): Promise<string[] | null> {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    system: `사용자의 비전을 읽고, 그 비전을 향해 오늘 안에 할 수 있는 작은 행동 3개를 제안하는 코치다.
- 각 행동은 한국어 20자 이내, "~하기" 형태.
- 10분~1시간 안에 끝낼 수 있을 만큼 작고 구체적으로. (예: "러닝 한 바퀴", "요가 원데이 클래스 등록하기", "지원할 대회 세 곳 찾기")
- 서로 성격이 다르게: 몸을 움직이는 것, 정보를 찾는 것, 사람과 연결되는 것 등.
- 최근에 이미 한 행동은 그대로 반복하지 말고 한 걸음 나아간 것을 제안한다.`,
    messages: [
      {
        role: 'user',
        content: `비전: ${vision.summary}\n시기: ${vision.answers[1] ?? ''}\n장소: ${vision.answers[2] ?? ''}\n\n최근에 한 행동:\n${recent.length ? recent.map((r) => `- ${r}`).join('\n') : '(아직 없음)'}`,
      },
    ],
    output_config: { effort: 'low', format: betaZodOutputFormat(ActionsSchema) },
  });

  if (response.stop_reason === 'refusal' || !response.parsed_output) return null;
  return response.parsed_output.actions.slice(0, 3);
}
