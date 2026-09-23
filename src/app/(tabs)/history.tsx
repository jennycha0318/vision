import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { dateKey, dayPoints } from '@/lib/score';
import { useStore } from '@/lib/store';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function label(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}월 ${d}일 ${WEEKDAYS[date.getDay()]}`;
}

export default function History() {
  const { state } = useStore();
  const month = dateKey().slice(0, 7);
  const days = Object.values(state.days)
    .filter((d) => d.gratitudes.length || d.actions.length || d.restedAction)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const thisMonth = days.filter((d) => d.date.startsWith(month));

  const stats = [
    { label: '기록한 날', value: thisMonth.length },
    { label: '행동', value: thisMonth.reduce((n, d) => n + d.actions.length, 0) },
    { label: '감사', value: thisMonth.reduce((n, d) => n + d.gratitudes.length, 0) },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>히스토리</Text>

        <Text style={styles.section}>이번 달</Text>
        <View style={styles.stats}>
          {stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {days.length === 0 ? (
          <Text style={styles.empty}>아직 기록이 없어요.{'\n'}오늘 탭에서 첫 기록을 남겨보세요.</Text>
        ) : (
          days.map((d) => (
            <View key={d.date} style={styles.day}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayDate}>{label(d.date)}</Text>
                <Text style={styles.dayPoints}>+{dayPoints(d)}</Text>
              </View>
              {d.gratitudes.map((g) => (
                <Text key={g.id} style={styles.line}>
                  <Text style={styles.tagG}>감사 </Text>
                  {g.text}
                </Text>
              ))}
              {d.actions.map((a) => (
                <Text key={a.id} style={styles.line}>
                  <Text style={styles.tagA}>행동 </Text>
                  {a.text}
                </Text>
              ))}
              {d.restedAction && d.actions.length === 0 && (
                <Text style={[styles.line, { color: Colors.inkFaint }]}>쉬어간 날</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: Colors.ink },
  section: { fontSize: 14, fontWeight: '700', color: Colors.inkSoft, marginTop: Spacing.sm },
  stats: { flexDirection: 'row', gap: Spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 26, fontWeight: '800', color: Colors.ink },
  statLabel: { fontSize: 13, color: Colors.inkSoft, marginTop: 2 },
  empty: { fontSize: 15, color: Colors.inkFaint, textAlign: 'center', lineHeight: 23, marginTop: Spacing.xl },
  day: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: Spacing.md,
    gap: 6,
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  dayDate: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  dayPoints: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  line: { fontSize: 15, color: Colors.ink, lineHeight: 22 },
  tagG: { color: Colors.sage, fontWeight: '700', fontSize: 13 },
  tagA: { color: Colors.accent, fontWeight: '700', fontSize: 13 },
});
