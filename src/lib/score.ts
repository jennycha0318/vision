import type { AppState, DayRecord } from './types';

export const MAX_SCORE = 100;
export const GRATITUDE_POINTS = 1;
export const ACTION_POINTS = 2;
export const GRID = 10; // 10 x 10 = 100칸, 1점 = 1칸

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + delta));
}

/** 칸 단위 점수: 감사 칸 1점, 행동 칸 2점. 개수와 무관. */
export function dayPoints(day: DayRecord | undefined): number {
  if (!day) return 0;
  return (day.gratitudes.length > 0 ? GRATITUDE_POINTS : 0) + (day.actions.length > 0 ? ACTION_POINTS : 0);
}

function hasAnyRecord(day: DayRecord | undefined): boolean {
  return !!day && (day.gratitudes.length > 0 || day.actions.length > 0 || day.restedAction);
}

/** 누적 점수. 절대 깎이지 않는다. */
export function totalScore(state: AppState): number {
  const start = state.vision?.startDate;
  if (!start) return 0;
  let sum = 0;
  for (const day of Object.values(state.days)) {
    if (day.date >= start) sum += dayPoints(day);
  }
  return Math.min(sum, MAX_SCORE);
}

/** 연속 기록 일수. 진행도와는 분리된 보조 지표. 오늘 아직 안 썼으면 어제까지로 센다. */
export function streak(state: AppState, today = dateKey()): number {
  let cursor = hasAnyRecord(state.days[today]) ? today : shiftDays(today, -1);
  let count = 0;
  while (hasAnyRecord(state.days[cursor])) {
    count += 1;
    cursor = shiftDays(cursor, -1);
  }
  return count;
}

/** 최근 7일 중 기록한 날의 비율 (0–1). 살아있는 단계의 움직임 세기에 쓴다. */
export function liveliness(state: AppState, today = dateKey()): number {
  let active = 0;
  for (let i = 0; i < 7; i++) {
    if (hasAnyRecord(state.days[shiftDays(today, -i)])) active += 1;
  }
  return active / 7;
}

export function lastRecordDate(state: AppState): string | null {
  const keys = Object.keys(state.days)
    .filter((k) => hasAnyRecord(state.days[k]))
    .sort();
  return keys.length ? keys[keys.length - 1] : null;
}

/**
 * 100칸이 채워지는 순서. 중심에서 바깥으로 번지되 약간의 무작위를 섞어
 * 물감이 스며드는 느낌을 준다. 비전 id로 시드를 고정해 매번 같은 순서.
 */
export function revealOrder(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const c = (GRID - 1) / 2;
  const cells = Array.from({ length: GRID * GRID }, (_, i) => {
    const x = i % GRID;
    const y = Math.floor(i / GRID);
    const dist = Math.hypot(x - c, y - c);
    return { i, w: dist + rand() * 3.2 };
  });
  cells.sort((a, b) => a.w - b.w);
  return cells.map((cell) => cell.i);
}
