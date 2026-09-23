import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { confirm } from '@/lib/dialog';
import { useStore } from '@/lib/store';

export default function ProfileScreen() {
  const { state, reset, email, signOut } = useStore();

  const confirmReset = async () => {
    if (await confirm('모든 데이터를 지울까요?', '비전과 기록이 모두 사라지고 되돌릴 수 없어요.', '지우기')) await reset();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>프로필</Text>

        <Card title="나">
          <Row label="나이대" value={state.profile?.ageGroup ?? '-'} />
          <Row label="성별" value={state.profile?.gender ?? '-'} />
          <Button title="수정하기" variant="secondary" onPress={() => router.push('/onboarding')} />
        </Card>

        <Card title="나의 비전">
          <Text style={styles.body}>{state.vision?.summary}</Text>
          <Button title="비전 바꾸기" variant="secondary" onPress={() => router.push('/vision')} />
        </Card>

        {Platform.OS === 'web' ? (
          <Card title="홈 화면에 추가">
            <Text style={styles.body}>
              사파리 하단의 공유 버튼 → 홈 화면에 추가를 누르면 앱처럼 쓸 수 있어요. 기록은 이 폰의 브라우저에 저장되니, 꼭 홈 화면 아이콘으로 열어주세요.
            </Text>
          </Card>
        ) : (
          <Card title="홈 화면 위젯">
            <Text style={styles.body}>
              홈 화면을 길게 누른 뒤 왼쪽 위 편집 → 위젯 추가 → 이 앱을 찾아 추가하세요. 앱을 열지 않아도 비전 그림이 보여요.
            </Text>
          </Card>
        )}

        <Card title="계정">
          {email && <Row label="이메일" value={email} />}
          {email && <Button title="로그아웃" variant="secondary" onPress={signOut} />}
          <Button title="모든 데이터 지우기" variant="ghost" onPress={confirmReset} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: Colors.ink },
  body: { fontSize: 15, color: Colors.ink, lineHeight: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 15, color: Colors.inkSoft },
  value: { fontSize: 15, color: Colors.ink, fontWeight: '600' },
});
