import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

/**
 * 이메일로 받은 로그인 코드로 로그인한다.
 * 링크 방식은 아이폰에서 홈 화면 앱이 아니라 사파리로 열려 로그인이 이어지지 않아서 코드를 쓴다.
 */
export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setError(error.message.includes('rate') ? '잠시 후 다시 시도해 주세요.' : '코드를 보내지 못했어요. 이메일을 확인해 주세요.');
    else setSent(true);
  };

  const verify = async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setError('코드가 맞지 않거나 만료됐어요.');
  };

  const validEmail = /\S+@\S+\.\S+/.test(email.trim());

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior="padding" style={styles.body}>
        <Text style={styles.eyebrow}>비전 보드</Text>
        <Text style={styles.title}>
          {sent ? '메일로 받은 코드를\n입력해 주세요' : '이루고 싶은 모습을\n매일 조금씩 채워가요'}
        </Text>
        <Text style={styles.sub}>
          {sent ? `${email.trim()} 으로 로그인 코드를 보냈어요.` : '이메일로 시작하면 어느 기기에서든 기록이 이어져요.'}
        </Text>

        {sent ? (
          <TextInput
            key="code"
            autoFocus
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 8))}
            placeholder="000000"
            placeholderTextColor={Colors.inkFaint}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            style={[styles.input, styles.code]}
            onSubmitEditing={verify}
          />
        ) : (
          <TextInput
            key="email"
            autoFocus
            value={email}
            onChangeText={setEmail}
            placeholder="이메일 주소"
            placeholderTextColor={Colors.inkFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={styles.input}
            onSubmitEditing={() => validEmail && sendCode()}
          />
        )}
        {error && <Text style={styles.error}>{error}</Text>}

        <View style={{ flex: 1 }} />
        {sent ? (
          <>
            <Button title="시작하기" onPress={verify} loading={busy} disabled={code.length < 6} />
            <Pressable
              onPress={() => {
                setSent(false);
                setCode('');
              }}
              style={styles.back}>
              <Text style={styles.backText}>다른 이메일로 받기</Text>
            </Pressable>
          </>
        ) : (
          <Button title="코드 받기" onPress={sendCode} loading={busy} disabled={!validEmail} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1, padding: Spacing.lg, paddingTop: Spacing.xl },
  eyebrow: { color: Colors.accent, fontWeight: '700', fontSize: 14, marginBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: '700', color: Colors.ink, lineHeight: 36 },
  sub: { fontSize: 15, color: Colors.inkSoft, marginTop: Spacing.md, lineHeight: 22 },
  input: {
    marginTop: Spacing.xl,
    fontSize: 18,
    color: Colors.ink,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  code: { fontSize: 28, letterSpacing: 10, textAlign: 'center', fontWeight: '700' },
  error: { color: Colors.accent, marginTop: Spacing.sm, fontSize: 14 },
  back: { alignItems: 'center', paddingVertical: Spacing.md },
  backText: { color: Colors.inkSoft, fontSize: 14 },
});
