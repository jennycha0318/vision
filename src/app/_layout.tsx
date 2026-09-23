import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LoginScreen } from '@/components/login-screen';
import { Colors } from '@/constants/theme';
import { MAX_APP_WIDTH } from '@/lib/layout';
import { lastRecordDate, streak, totalScore } from '@/lib/score';
import { StoreProvider, useStore } from '@/lib/store';
import { syncWidget } from '@/lib/widget';

SplashScreen.preventAutoHideAsync();

function WidgetSync() {
  const { ready, state } = useStore();
  const key = [state.vision?.id, state.vision?.imageFile, totalScore(state), streak(state), lastRecordDate(state)].join('|');
  useEffect(() => {
    if (ready) syncWidget(state);
    // state 전체가 아니라 위젯에 보이는 값이 바뀔 때만 다시 그린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);
  return null;
}

function Root() {
  const { ready, needsLogin, syncError } = useStore();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  return (
    <View style={styles.app}>
      {needsLogin ? (
        <LoginScreen />
      ) : (
        <>
          <WidgetSync />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
            <Stack.Screen name="vision" options={{ presentation: 'fullScreenModal' }} />
          </Stack>
        </>
      )}
      {syncError && (
        <View style={styles.banner} pointerEvents="none">
          <Text style={styles.bannerText}>{syncError}</Text>
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <StoreProvider>
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <StatusBar style="dark" />
        <Root />
      </View>
    </StoreProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, width: '100%', maxWidth: MAX_APP_WIDTH, alignSelf: 'center' },
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    backgroundColor: Colors.ink,
    borderRadius: 12,
    padding: 12,
  },
  bannerText: { color: '#fff', fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
