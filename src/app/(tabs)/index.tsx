import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip } from '@/components/ui';
import { VisionCanvas } from '@/components/vision-canvas';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { suggestActions } from '@/lib/ai';
import { visionImageUri } from '@/lib/image';
import { dateKey, liveliness, MAX_SCORE, streak, totalScore } from '@/lib/score';
import { useAppWidth } from '@/lib/layout';
import { useStore } from '@/lib/store';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function Today() {
  const { state, addTodayRecord, setSuggestions } = useStore();
  const vision = state.vision!;
  const width = useAppWidth();
  const scrollRef = useRef<ScrollView>(null);

  const today = dateKey();
  const day = state.days[today];
  const score = totalScore(state);
  const days = streak(state);
  const life = liveliness(state);

  const [gratitude, setGratitude] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [rested, setRested] = useState(false);
  const [fresh, setFresh] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // 오늘의 행동 제안: 하루에 한 번만 받아온다
  const cached = state.suggestions?.date === today && state.suggestions.visionId === vision.id ? state.suggestions.actions : null;
  const [loadingSuggestions, setLoadingSuggestions] = useState(!cached);
  useEffect(() => {
    if (cached) return;
    const recent = Object.values(state.days)
      .flatMap((d) => d.actions)
      .sort((a, b) => b.at - a.at)
      .slice(0, 10)
      .map((a) => a.text);
    let alive = true;
    setLoadingSuggestions(true);
    suggestActions(vision, recent)
      .then((actions) => alive && setSuggestions(vision.id, actions))
      .catch((e) => console.warn('행동 제안 실패', e))
      .finally(() => alive && setLoadingSuggestions(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, vision.id]);
  const suggestions = cached ?? [];

  const dateLabel = useMemo(() => {
    const d = new Date();
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
  }, []);

  const toggleAction = (text: string) => {
    Haptics.selectionAsync();
    setRested(false);
    setSelected((prev) => (prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text]));
  };

  const addCustom = () => {
    const t = custom.trim();
    if (!t) return;
    setRested(false);
    setSelected((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setCustom('');
  };

  const toggleRest = () => {
    Haptics.selectionAsync();
    setRested((r) => !r);
    setSelected([]);
    setCustom('');
  };

  const pendingActions = custom.trim() && !selected.includes(custom.trim()) ? [...selected, custom.trim()] : selected;
  const canRecord = !!gratitude.trim() || pendingActions.length > 0 || rested;

  const record = () => {
    const gained = addTodayRecord({ gratitude, actions: pendingActions, restedAction: rested });
    setFresh(gained);
    setGratitude('');
    setSelected([]);
    setCustom('');
    setRested(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scrollRef.current?.scrollTo({ y: 0, animated: true });

    const reached = score < MAX_SCORE && score + gained >= MAX_SCORE;
    setToast(
      reached
        ? '그림이 모두 채워졌어요! 이제 살아 움직여요'
        : gained > 0
          ? `+${gained}점 · 그림이 ${gained}칸 채워졌어요`
          : rested && pendingActions.length === 0 && !gratitude.trim()
            ? '쉬어가는 것도 기록이에요'
            : '기록을 더했어요. 오늘 점수는 이미 다 받았어요',
    );
    setTimeout(() => setToast(null), 2800);
  };

  const imageWidth = width - Spacing.lg * 2;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.date}>{dateLabel}</Text>

          {/* 1. 비전 이미지 — 보상 먼저 */}
          <VisionCanvas
            uri={visionImageUri(vision.imageFile)}
            seed={vision.id}
            width={imageWidth}
            aspect={vision.imageHeight / vision.imageWidth}
            filled={score}
            fresh={fresh}
            life={life}
          />
          <Text style={styles.summary}>{vision.summary}</Text>

          {/* 2. 진행도 + 작은 연속 기록 */}
          <View style={styles.progressRow}>
            <Text style={styles.percent}>
              {score}
              <Text style={styles.percentUnit}>%</Text>
            </Text>
            {days > 0 && <Text style={styles.streak}>{days}일 연속 기록 중</Text>}
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${score}%` }]} />
          </View>

          {score >= MAX_SCORE && (
            <View style={styles.alive}>
              <Text style={styles.aliveTitle}>비전 그림을 다 채웠어요</Text>
              <Text style={styles.aliveText}>
                이제 그림이 살아 움직여요. 최근에 기록할수록 더 생생해지고, 한참 쉬면 조용해져요.
              </Text>
            </View>
          )}

          {/* 3. 오늘의 감사 */}
          <Card title="오늘의 감사" right={day?.gratitudes.length ? <Done points={1} /> : <Hint text="+1" />}>
            {day?.gratitudes.map((g) => (
              <Text key={g.id} style={styles.recorded}>
                · {g.text}
              </Text>
            ))}
            <TextInput
              value={gratitude}
              onChangeText={setGratitude}
              placeholder={day?.gratitudes.length ? '감사한 일 더 적기' : '오늘 사소하게 감사했던 순간 한 가지'}
              placeholderTextColor={Colors.inkFaint}
              style={styles.input}
              returnKeyType="done"
            />
          </Card>

          {/* 4. 오늘의 행동 */}
          <Card title="오늘의 행동" right={day?.actions.length ? <Done points={2} /> : <Hint text="+2" />}>
            {day?.actions.map((a) => (
              <Text key={a.id} style={styles.recorded}>
                ✓ {a.text}
              </Text>
            ))}
            <Text style={styles.cardSub}>비전을 향해 오늘 새롭게 옮긴 것</Text>
            <View style={styles.chips}>
              {loadingSuggestions && suggestions.length === 0
                ? [0, 1, 2].map((i) => <View key={i} style={styles.chipSkeleton} />)
                : suggestions.map((s) => (
                    <Chip key={s} label={s} selected={selected.includes(s)} onPress={() => toggleAction(s)} />
                  ))}
            </View>
            {selected
              .filter((s) => !suggestions.includes(s))
              .map((s) => (
                <View key={s} style={styles.customRow}>
                  <Text style={styles.recorded}>· {s}</Text>
                  <Pressable hitSlop={10} onPress={() => toggleAction(s)}>
                    <Text style={styles.remove}>삭제</Text>
                  </Pressable>
                </View>
              ))}
            {!rested && (
              <View style={styles.customRow}>
                <TextInput
                  value={custom}
                  onChangeText={setCustom}
                  onSubmitEditing={addCustom}
                  placeholder="직접 적기"
                  placeholderTextColor={Colors.inkFaint}
                  style={[styles.input, { flex: 1 }]}
                  returnKeyType="done"
                  submitBehavior="submit"
                />
                {!!custom.trim() && (
                  <Pressable hitSlop={10} onPress={addCustom}>
                    <Text style={styles.add}>추가</Text>
                  </Pressable>
                )}
              </View>
            )}
            <View style={styles.chips}>
              <Chip label="오늘은 쉬어갈게요" tone="sage" selected={rested} onPress={toggleRest} />
            </View>
          </Card>

          {/* 5. 기록 버튼 */}
          <Button title="기록하기" onPress={record} disabled={!canRecord} />
          <Text style={styles.footnote}>감사 1점 · 행동 2점 · 하루 최대 3점. 점수는 깎이지 않아요.</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {toast && (
        <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function Done({ points }: { points: number }) {
  return <Text style={styles.done}>+{points} 받음</Text>;
}

function Hint({ text }: { text: string }) {
  return <Text style={styles.hint}>{text}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.md },
  date: { fontSize: 15, fontWeight: '600', color: Colors.inkSoft },
  summary: { fontSize: 15, color: Colors.ink, lineHeight: 22, marginTop: -4 },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  percent: { fontSize: 40, fontWeight: '800', color: Colors.ink, letterSpacing: -1 },
  percentUnit: { fontSize: 20, fontWeight: '700', color: Colors.inkSoft },
  streak: { fontSize: 13, color: Colors.inkSoft },
  bar: { height: 6, borderRadius: 3, backgroundColor: Colors.line, overflow: 'hidden', marginTop: -8 },
  barFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 3 },
  alive: { backgroundColor: Colors.sageSoft, borderRadius: Radius.md, padding: Spacing.md, gap: 4 },
  aliveTitle: { fontSize: 15, fontWeight: '700', color: Colors.sage },
  aliveText: { fontSize: 13, color: Colors.inkSoft, lineHeight: 19 },
  cardSub: { fontSize: 13, color: Colors.inkFaint, marginTop: -6 },
  input: {
    fontSize: 16,
    color: Colors.ink,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  recorded: { fontSize: 15, color: Colors.ink, lineHeight: 22, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chipSkeleton: { width: 120, height: 38, borderRadius: 999, backgroundColor: Colors.background },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, justifyContent: 'space-between' },
  remove: { fontSize: 13, color: Colors.inkFaint },
  add: { fontSize: 15, color: Colors.accent, fontWeight: '700' },
  done: { fontSize: 13, fontWeight: '700', color: Colors.sage },
  hint: { fontSize: 13, fontWeight: '600', color: Colors.inkFaint },
  footnote: { fontSize: 12, color: Colors.inkFaint, textAlign: 'center' },
  toast: {
    position: 'absolute',
    top: 64,
    alignSelf: 'center',
    backgroundColor: Colors.ink,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
