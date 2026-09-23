import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { EMPTY_STATE, type AppState, type DayRecord, type Entry, type Profile, type Vision } from './types';
import { dateKey, dayPoints } from './score';

const STORAGE_KEY = 'vision-board/state/v1';

type RecordInput = {
  gratitude?: string;
  actions: string[];
  restedAction: boolean;
};

type Store = {
  ready: boolean;
  state: AppState;
  setProfile: (profile: Profile) => void;
  setVision: (vision: Vision) => void;
  /** 오늘 기록을 저장하고, 이번 저장으로 새로 얻은 점수를 돌려준다 */
  addTodayRecord: (input: RecordInput) => number;
  setSuggestions: (visionId: string, actions: string[]) => void;
  reset: () => void;
};

const StoreContext = createContext<Store | null>(null);

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const loaded = { ...EMPTY_STATE, ...JSON.parse(raw) } as AppState;
          stateRef.current = loaded;
          setState(loaded);
        }
      })
      .catch((e) => console.warn('상태 불러오기 실패', e))
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((fn: (prev: AppState) => AppState) => {
    const next = fn(stateRef.current);
    stateRef.current = next;
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) => console.warn('상태 저장 실패', e));
    return next;
  }, []);

  const store: Store = {
    ready,
    state,
    setProfile: (profile) => update((s) => ({ ...s, profile })),
    setVision: (vision) => update((s) => ({ ...s, vision, suggestions: null })),
    addTodayRecord: ({ gratitude, actions, restedAction }) => {
      const key = dateKey();
      const before = dayPoints(stateRef.current.days[key]);
      const now = Date.now();
      const toEntry = (text: string): Entry => ({ id: newId(), text: text.trim(), at: now });
      const next = update((s) => {
        const prev: DayRecord = s.days[key] ?? { date: key, gratitudes: [], actions: [], restedAction: false };
        const g = gratitude?.trim();
        const day: DayRecord = {
          ...prev,
          gratitudes: g ? [...prev.gratitudes, toEntry(g)] : prev.gratitudes,
          actions: [...prev.actions, ...actions.filter((a) => a.trim()).map(toEntry)],
          restedAction: prev.restedAction || restedAction,
        };
        return { ...s, days: { ...s.days, [key]: day } };
      });
      return dayPoints(next.days[key]) - before;
    },
    setSuggestions: (visionId, actions) =>
      update((s) => ({ ...s, suggestions: { date: dateKey(), visionId, actions } })),
    reset: () => update(() => EMPTY_STATE),
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
