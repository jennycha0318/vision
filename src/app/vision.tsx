import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VisionCanvas } from '@/components/vision-canvas';
import { Button, Card } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { draftVision, type Drafted } from '@/lib/ai';
import { notify } from '@/lib/dialog';
import { persistVisionImage, pickVisionImage, type PickedImage } from '@/lib/image';
import { VISION_QUESTIONS } from '@/lib/questions';
import { dateKey } from '@/lib/score';
import { useAppWidth } from '@/lib/layout';
import { useStore } from '@/lib/store';

const TOTAL = VISION_QUESTIONS.length;

export default function VisionCreate() {
  const { state, setVision } = useStore();
  const width = useAppWidth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => state.vision?.answers ?? Array(TOTAL).fill(''));
  const [draft, setDraft] = useState<Drafted | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [copied, setCopied] = useState(false);

  const isQuestion = step < TOTAL;
  const q = VISION_QUESTIONS[Math.min(step, TOTAL - 1)];
  const current = answers[step] ?? '';

  const makeDraft = async () => {
    if (!state.profile) return;
    setStep(TOTAL);
    setDrafting(true);
    try {
      setDraft(await draftVision(answers, state.profile));
    } catch (e) {
      console.warn(e);
      notify('장면을 만들지 못했어요', '네트워크를 확인하고 다시 시도해 주세요.');
      setStep(TOTAL - 1);
    } finally {
      setDrafting(false);
    }
  };

  const next = () => {
    Haptics.selectionAsync();
    if (step < TOTAL - 1) setStep(step + 1);
    else makeDraft();
  };

  const copyPrompt = async () => {
    if (!draft) return;
    await Clipboard.setStringAsync(draft.imagePrompt);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const choose = async () => {
    const img = await pickVisionImage();
    if (img) setPicked(img);
  };

  const start = async () => {
    if (!draft || !picked) return;
    const id = `${Date.now().toString(36)}`;
    const imageFile = await persistVisionImage(picked, id);
    setVision({
      id,
      startDate: dateKey(),
      answers,
      summary: draft.summary.trim() || answers[0],
      imagePrompt: draft.imagePrompt,
      imageFile,
      imageWidth: picked.width,
      imageHeight: picked.height,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/');
  };

  const close = () => (router.canGoBack() ? router.back() : null);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        {step > 0 && !drafting ? (
          <Pressable hitSlop={12} onPress={() => setStep(step - 1)}>
            <Text style={styles.topLink}>이전</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <View style={styles.dots}>
          {Array.from({ length: TOTAL + 1 }, (_, i) => (
            <View key={i} style={[styles.dot, i <= step && styles.dotOn]} />
          ))}
        </View>
        {state.vision ? (
          <Pressable hitSlop={12} onPress={close}>
            <Text style={styles.topLink}>닫기</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {isQuestion ? (
          <View style={styles.body}>
            <Text style={styles.eyebrow}>
              {step + 1} / {TOTAL}
            </Text>
            <Text style={styles.title}>{q.title}</Text>
            {'hint' in q && <Text style={styles.hint}>{q.hint}</Text>}
            <TextInput
              key={step}
              autoFocus
              multiline
              value={current}
              onChangeText={(t) => setAnswers((prev) => prev.map((a, i) => (i === step ? t : a)))}
              placeholder={q.placeholder}
              placeholderTextColor={Colors.inkFaint}
              style={styles.input}
            />
            {step === 0 && state.vision && (
              <Text style={styles.warn}>새 비전으로 바꾸면 그림은 처음부터 다시 채워요. 지금까지의 기록은 히스토리에 남아요.</Text>
            )}
            <View style={{ flex: 1 }} />
            <Button title={step < TOTAL - 1 ? '다음' : '장면 그리기'} onPress={next} disabled={!current.trim()} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.result} keyboardShouldPersistTaps="handled">
            {drafting || !draft ? (
              <View style={styles.loading}>
                <Text style={styles.title}>당신의 장면을{'\n'}그리고 있어요</Text>
                <Text style={styles.hint}>말해준 공간과 분위기를 하나로 엮는 중이에요.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.eyebrow}>나의 비전</Text>
                <TextInput
                  multiline
                  value={draft.summary}
                  onChangeText={(summary) => setDraft({ ...draft, summary })}
                  style={styles.summary}
                />

                {picked ? (
                  <>
                    <VisionCanvas
                      uri={picked.uri}
                      seed="preview"
                      width={width - Spacing.lg * 2}
                      aspect={picked.height / picked.width}
                      filled={100}
                    />
                    <Text style={styles.hint}>시작하면 이 그림이 흑백이 되고, 기록할 때마다 한 칸씩 색이 차올라요.</Text>
                    <Button title="이 그림으로 시작하기" onPress={start} />
                    <Button title="다른 그림 고르기" variant="secondary" onPress={choose} />
                  </>
                ) : (
                  <>
                    <Card
                      title="1. 프롬프트 복사하기"
                      right={
                        <Pressable onPress={copyPrompt} hitSlop={8}>
                          <Text style={styles.copy}>{copied ? '복사됨 ✓' : '복사'}</Text>
                        </Pressable>
                      }>
                      <Text selectable style={styles.prompt}>
                        {draft.imagePrompt}
                      </Text>
                    </Card>
                    <Card title="2. 이미지 만들기">
                      <Text style={styles.cardText}>
                        ChatGPT에 붙여넣고 그림을 만든 뒤, 그림을 길게 눌러 사진첩에 저장하세요.
                      </Text>
                    </Card>
                    <Card title="3. 그림 고르기">
                      <Text style={styles.cardText}>저장한 그림을 골라주세요. 이 한 장이 앞으로 채워갈 나의 비전이에요.</Text>
                      <Button title="사진첩에서 고르기" onPress={choose} />
                    </Card>
                    {draft.source === 'template' && (
                      <Text style={styles.note}>AI에 연결하지 못해 기본 템플릿으로 프롬프트를 만들었어요.</Text>
                    )}
                  </>
                )}
              </>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  top: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  topLink: { color: Colors.inkSoft, fontSize: 15, minWidth: 32 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.line },
  dotOn: { backgroundColor: Colors.accent },
  body: { flex: 1, padding: Spacing.lg, paddingBottom: Spacing.md },
  eyebrow: { color: Colors.accent, fontWeight: '700', fontSize: 14, marginBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: '700', color: Colors.ink, lineHeight: 36 },
  hint: { fontSize: 14, color: Colors.inkSoft, lineHeight: 21, marginTop: Spacing.sm },
  input: {
    marginTop: Spacing.lg,
    minHeight: 120,
    fontSize: 18,
    lineHeight: 27,
    color: Colors.ink,
    textAlignVertical: 'top',
  },
  warn: { fontSize: 13, color: Colors.accent, lineHeight: 19 },
  result: { padding: Spacing.lg, gap: Spacing.md },
  loading: { paddingTop: Spacing.xl * 2 },
  summary: { fontSize: 22, fontWeight: '700', color: Colors.ink, lineHeight: 31, marginBottom: Spacing.sm },
  copy: { color: Colors.accent, fontWeight: '700', fontSize: 14 },
  prompt: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.inkSoft,
    backgroundColor: Colors.background,
    padding: Spacing.md - 4,
    borderRadius: Radius.sm,
  },
  cardText: { fontSize: 14, color: Colors.inkSoft, lineHeight: 21 },
  note: { fontSize: 12, color: Colors.inkFaint, textAlign: 'center' },
});
