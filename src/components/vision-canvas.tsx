import { Canvas, Group, LinearGradient, Rect, RoundedRect, useImage, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius } from '@/constants/theme';
import { revealOrder } from '@/lib/score';

import { VisionPicture } from './vision-picture';

type Props = {
  uri: string;
  seed: string;
  width: number;
  aspect: number; // height / width
  filled: number;
  /** 방금 새로 채워진 칸 수 — 이 칸들이 번지듯 채워진다 */
  fresh?: number;
  /** 0–1. 100점 이후 살아있는 단계의 움직임 세기 */
  life?: number;
};

export function VisionCanvas({ uri, seed, width, aspect, filled, fresh = 0, life = 0 }: Props) {
  const image = useImage(uri);
  const order = useMemo(() => revealOrder(seed), [seed]);
  const height = Math.round(width * Math.min(Math.max(aspect, 0.6), 1.4));
  const alive = filled >= 100;

  // 새 칸이 번지는 애니메이션
  const newOpacity = useSharedValue(fresh > 0 ? 0 : 1);
  useEffect(() => {
    if (fresh > 0) {
      newOpacity.value = 0;
      newOpacity.value = withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) });
    }
  }, [fresh, filled, newOpacity]);

  // 살아있는 단계: 느린 숨쉬기 + 빛 일렁임. 최근 기록이 적을수록 조용해진다
  const breath = useSharedValue(0);
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (!alive || life <= 0) {
      cancelAnimation(breath);
      cancelAnimation(sweep);
      breath.value = withTiming(0);
      sweep.value = 0;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    sweep.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.quad) }), -1);
  }, [alive, life, breath, sweep]);

  const transform = useDerivedValue(() => [{ scale: 1 + breath.value * 0.025 * life }]);
  const lightStart = useDerivedValue(() => vec(-width + sweep.value * width * 2.2, 0));
  const lightEnd = useDerivedValue(() => vec(-width * 0.4 + sweep.value * width * 2.2, height));

  return (
    <View style={[styles.frame, { width, height }]}>
      {image ? (
        <Canvas style={{ width, height }}>
          <Group clip={{ rect: { x: 0, y: 0, width, height }, rx: Radius.lg, ry: Radius.lg }}>
            <Group transform={transform} origin={vec(width / 2, height / 2)}>
              <VisionPicture
                image={image}
                width={width}
                height={height}
                order={order}
                filled={filled}
                fresh={fresh}
                newOpacity={newOpacity}
              />
            </Group>
            {alive && life > 0 && (
              <Rect x={0} y={0} width={width} height={height} blendMode="softLight" opacity={0.35 + 0.4 * life}>
                <LinearGradient
                  start={lightStart}
                  end={lightEnd}
                  colors={['#FFFFFF00', '#FFF4D6FF', '#FFFFFF00']}
                  positions={[0.3, 0.5, 0.7]}
                />
              </Rect>
            )}
          </Group>
          <RoundedRect x={0.5} y={0.5} width={width - 1} height={height - 1} r={Radius.lg} style="stroke" strokeWidth={1} color="#00000010" />
        </Canvas>
      ) : (
        <ActivityIndicator color={Colors.inkFaint} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
