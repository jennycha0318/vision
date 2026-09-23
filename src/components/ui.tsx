import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        inactive && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.ink} />
      ) : (
        <Text style={[styles.buttonText, variant !== 'primary' && { color: Colors.ink }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tone = 'accent',
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  tone?: 'accent' | 'sage';
}) {
  const on = tone === 'accent' ? { bg: Colors.accentSoft, fg: Colors.accent } : { bg: Colors.sageSoft, fg: Colors.sage };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: on.bg, borderColor: on.fg }]}>
      <Text style={[styles.chipText, selected && { color: on.fg, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.card}>
      {(title || right) && (
        <View style={styles.cardHeader}>
          {title && <Text style={styles.cardTitle}>{title}</Text>}
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  primary: { backgroundColor: Colors.ink },
  secondary: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.line },
  ghost: { backgroundColor: 'transparent' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.card,
  },
  chipText: { fontSize: 14, color: Colors.inkSoft },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md + 2,
    gap: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.ink },
});
