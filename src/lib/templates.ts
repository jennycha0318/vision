import type { Profile } from './types';

export type VisionDraft = {
  summary: string;
  imagePrompt: string;
};

/** AI를 쓸 수 없을 때 쓰는 고정 템플릿 프롬프트 */
export function templateVision(answers: string[], profile: Profile): VisionDraft {
  const [goal, when, where, pose, people] = answers.map((a) => a?.trim() ?? '');
  const who = `${profile.ageGroup}${profile.gender === '밝히지 않음' ? '' : ` ${profile.gender}`}`;
  return {
    summary: goal,
    imagePrompt: [
      `A vivid, simple-composition watercolor illustration with saturated colors.`,
      `Scene (${when}): ${where}.`,
      `The main character is a person in their ${who}, shown from behind or in side view with no facial details. Posture and mood: ${pose}.`,
      people
        ? `Around them: ${people}. Other people have minimal facial detail; their gaze is directed at the main character or the shared task, not at the viewer.`
        : '',
      `The moment captures: ${goal}.`,
      `No text, no logos, no watermark.`,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

export const FALLBACK_ACTIONS = ['비전과 관련된 글 한 편 읽기', '10분 동안 몸 움직이기', '도움 줄 사람에게 연락하기'];
