import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useStore } from '@/lib/store';
import type { AgeGroup, Gender } from '@/lib/types';

const AGES: AgeGroup[] = ['10대', '20대', '30대', '40대', '50대', '60대 이상'];
const GENDERS: Gender[] = ['여성', '남성', '밝히지 않음'];

export default function Onboarding() {
  const { state, setProfile } = useStore();
  const [age, setAge] = useState<AgeGroup | null>(state.profile?.ageGroup ?? null);
  const [gender, setGender] = useState<Gender | null>(state.profile?.gender ?? null);

  const next = () => {
    if (!age || !gender) return;
    setProfile({ ageGroup: age, gender });
    if (state.vision && router.canGoBack()) router.back();
    else router.replace(state.vision ? '/' : '/vision');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>반가워요</Text>
        <Text style={styles.title}>당신이 원하는 모습을{'\n'}한 장의 그림으로 그려볼게요</Text>
        <Text style={styles.sub}>그림 속 주인공을 그리기 위해 딱 한 번만 여쭤볼게요.{'\n'}얼굴은 그리지 않아요.</Text>

        <Text style={styles.label}>나이대</Text>
        <View style={styles.row}>
          {AGES.map((a) => (
            <Chip key={a} label={a} selected={age === a} onPress={() => setAge(a)} />
          ))}
        </View>

        <Text style={styles.label}>성별</Text>
        <View style={styles.row}>
          {GENDERS.map((g) => (
            <Chip key={g} label={g} selected={gender === g} onPress={() => setGender(g)} />
          ))}
        </View>
      </View>
      <Button title="다음" onPress={next} disabled={!age || !gender} style={styles.cta} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  eyebrow: { color: Colors.accent, fontWeight: '700', fontSize: 14, marginBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: '700', color: Colors.ink, lineHeight: 36 },
  sub: { fontSize: 15, color: Colors.inkSoft, marginTop: Spacing.md, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.ink, marginTop: Spacing.xl, marginBottom: Spacing.sm + 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cta: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
});
