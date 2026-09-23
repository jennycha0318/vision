import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { ensureVisionImage, uploadVisionImage } from './image';
import { deleteAllRemote, loadRemoteState, saveDayAdditions, saveProfile, saveVision } from './remote';
import { dateKey, dayPoints } from './score';
import { supabase } from './supabase';
import { EMPTY_STATE, type AppState, type DayRecord, type Entry, type Profile, type SuggestionCache, type Vision } from './types';

/** Supabase가 없으면 기기에만 저장 (개발용) */
const LOCAL_KEY = 'vision-board/state/v1';
const SUGGESTIONS_KEY = 'vision-board/suggestions/v1';

export const cloudEnabled = !!supabase;

type RecordInput = {
  gratitude?: string;
  actions: string[];
  restedAction: boolean;
};

type Store = {
  ready: boolean;
  /** 클라우드 모드에서 로그인이 필요한 상태 */
  needsLogin: boolean;
  email: string | null;
  syncError: string | null;
  state: AppState;
  setProfile: (profile: Profile) => void;
  setVision: (vision: Vision) => void;
  /** 오늘 기록을 저장하고, 이번 저장으로 새로 얻은 점수를 돌려준다 */
  addTodayRecord: (input: RecordInput) => number;
  setSuggestions: (visionId: string, actions: string[]) => void;
  reset: () => Promise<void>;
  signOut: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(!cloudEnabled);
  const [syncError, setSyncError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const userId = session?.user.id ?? null;

  // 로그인 상태 구독
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  // 상태 불러오기: 클라우드면 로그인한 사용자의 데이터, 아니면 기기 저장소
  useEffect(() => {
    if (!authChecked) return;
    if (cloudEnabled && !userId) {
      stateRef.current = EMPTY_STATE;
      setState(EMPTY_STATE);
      setReady(true);
      return;
    }
    let alive = true;
    setReady(false);
    (async () => {
      let loaded: AppState = EMPTY_STATE;
      try {
        if (userId) {
          loaded = await loadRemoteState(userId);
          if (loaded.vision) await ensureVisionImage(userId, loaded.vision.imageFile);
        } else {
          const raw = await AsyncStorage.getItem(LOCAL_KEY);
          if (raw) loaded = { ...EMPTY_STATE, ...JSON.parse(raw) };
        }
        const cached = await AsyncStorage.getItem(SUGGESTIONS_KEY);
        if (cached) loaded = { ...loaded, suggestions: JSON.parse(cached) as SuggestionCache };
      } catch (e) {
        console.warn('상태 불러오기 실패', e);
        setSyncError('기록을 불러오지 못했어요. 네트워크를 확인해 주세요.');
      }
      if (!alive) return;
      stateRef.current = loaded;
      setState(loaded);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [authChecked, userId]);

  const update = useCallback((fn: (prev: AppState) => AppState) => {
    const next = fn(stateRef.current);
    stateRef.current = next;
    setState(next);
    if (!cloudEnabled) {
      AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next)).catch((e) => console.warn('상태 저장 실패', e));
    }
    return next;
  }, []);

  /** 화면은 먼저 바꾸고 서버 저장은 뒤에서. 실패하면 알려준다 */
  const push = useCallback(
    (task: (uid: string) => Promise<void>) => {
      if (!userId) return;
      task(userId)
        .then(() => setSyncError(null))
        .catch((e) => {
          console.warn('서버 저장 실패', e);
          setSyncError('서버에 저장하지 못했어요. 새로고침하면 마지막 기록이 사라질 수 있어요.');
        });
    },
    [userId],
  );

  const store: Store = {
    ready,
    needsLogin: cloudEnabled && authChecked && !userId,
    email: session?.user.email ?? null,
    syncError,
    state,
    setProfile: (profile) => {
      update((s) => ({ ...s, profile }));
      push((uid) => saveProfile(uid, profile));
    },
    setVision: (vision) => {
      update((s) => ({ ...s, vision, suggestions: null }));
      push(async (uid) => {
        await uploadVisionImage(uid, vision.imageFile);
        await saveVision(uid, vision);
      });
    },
    addTodayRecord: ({ gratitude, actions, restedAction }) => {
      const key = dateKey();
      const before = dayPoints(stateRef.current.days[key]);
      const now = Date.now();
      const toEntry = (text: string): Entry => ({ id: newId(), text: text.trim(), at: now });
      const g = gratitude?.trim();
      const added = {
        gratitudes: g ? [toEntry(g)] : [],
        actions: actions.filter((a) => a.trim()).map(toEntry),
        rested: restedAction,
      };
      const next = update((s) => {
        const prev: DayRecord = s.days[key] ?? { date: key, gratitudes: [], actions: [], restedAction: false };
        const day: DayRecord = {
          ...prev,
          gratitudes: [...prev.gratitudes, ...added.gratitudes],
          actions: [...prev.actions, ...added.actions],
          restedAction: prev.restedAction || restedAction,
        };
        return { ...s, days: { ...s.days, [key]: day } };
      });
      push((uid) => saveDayAdditions(uid, key, added));
      return dayPoints(next.days[key]) - before;
    },
    setSuggestions: (visionId, actions) => {
      const suggestions: SuggestionCache = { date: dateKey(), visionId, actions };
      update((s) => ({ ...s, suggestions }));
      AsyncStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions)).catch(() => {});
    },
    reset: async () => {
      if (userId) await deleteAllRemote(userId);
      await AsyncStorage.multiRemove([LOCAL_KEY, SUGGESTIONS_KEY]);
      update(() => EMPTY_STATE);
    },
    signOut: async () => {
      await AsyncStorage.removeItem(SUGGESTIONS_KEY);
      await supabase?.auth.signOut();
    },
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

