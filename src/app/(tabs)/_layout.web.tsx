import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import Tabs from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { Colors } from '@/constants/theme';
import { useStore } from '@/lib/store';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon =
  (on: IconName, off: IconName) =>
  ({ focused, color }: { focused: boolean; color: ColorValue }) => <Ionicons name={focused ? on : off} size={22} color={color as string} />;

export default function TabsLayout() {
  const { state } = useStore();
  if (!state.profile) return <Redirect href="/onboarding" />;
  if (!state.vision) return <Redirect href="/vision" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.inkFaint,
        tabBarStyle: { backgroundColor: Colors.card, borderTopColor: Colors.line },
        sceneStyle: { backgroundColor: Colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: '오늘', tabBarIcon: icon('sunny', 'sunny-outline') }} />
      <Tabs.Screen name="history" options={{ title: '히스토리', tabBarIcon: icon('book', 'book-outline') }} />
      <Tabs.Screen name="profile" options={{ title: '프로필', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
