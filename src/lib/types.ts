export type AgeGroup = '10대' | '20대' | '30대' | '40대' | '50대' | '60대 이상';
export type Gender = '여성' | '남성' | '밝히지 않음';

export type Profile = {
  ageGroup: AgeGroup;
  gender: Gender;
};

export type Vision = {
  id: string;
  /** 'YYYY-MM-DD' — 이 날부터의 기록만 점수에 반영 */
  startDate: string;
  /** 비전 생성 5문항 답변, 순서 고정 */
  answers: string[];
  /** 한 줄 비전 문장 (화면 표시 + 행동 제안 근거) */
  summary: string;
  /** 이미지 도구에 넣을 프롬프트 */
  imagePrompt: string;
  /** 문서 디렉터리 기준 파일 이름 (iOS 컨테이너 경로는 업데이트마다 바뀔 수 있음) */
  imageFile: string;
  imageWidth: number;
  imageHeight: number;
};

export type Entry = {
  id: string;
  text: string;
  at: number;
};

export type DayRecord = {
  date: string;
  gratitudes: Entry[];
  actions: Entry[];
  /** "오늘은 쉬어갈게요" — 행동 칸을 당당하게 비운 날 */
  restedAction: boolean;
};

export type SuggestionCache = {
  date: string;
  visionId: string;
  actions: string[];
};

export type AppState = {
  profile: Profile | null;
  vision: Vision | null;
  days: Record<string, DayRecord>;
  suggestions: SuggestionCache | null;
};

export const EMPTY_STATE: AppState = {
  profile: null,
  vision: null,
  days: {},
  suggestions: null,
};
