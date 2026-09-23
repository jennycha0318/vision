import { ExtensionStorage } from '@bacons/apple-targets';
import { drawAsImage, ImageFormat, Skia } from '@shopify/react-native-skia';
import { createElement } from 'react';
import { Platform } from 'react-native';

import { VisionPicture } from '@/components/vision-picture';

import { visionImageUri } from './image';
import { lastRecordDate, MAX_SCORE, revealOrder, streak, totalScore } from './score';
import type { AppState } from './types';

/** app.json의 ios.entitlements와 targets/widget/expo-target.config.js가 같은 값을 써야 한다 */
export const APP_GROUP = 'group.com.jennycha.visionboard';

const storage = new ExtensionStorage(APP_GROUP);
const SNAPSHOT_LONG_SIDE = 720;

/**
 * 현재 진행도가 반영된 그림을 한 장으로 렌더링해 위젯과 공유한다.
 * Expo Go에서는 네이티브 모듈이 없어 조용히 아무 일도 하지 않는다.
 */
export async function syncWidget(state: AppState): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const vision = state.vision;
  if (!vision) {
    storage.remove('snapshot');
    ExtensionStorage.reloadWidget();
    return;
  }

  try {
    const data = await Skia.Data.fromURI(visionImageUri(vision.imageFile));
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) return;

    const scale = SNAPSHOT_LONG_SIDE / Math.max(vision.imageWidth, vision.imageHeight);
    const width = Math.round(vision.imageWidth * scale);
    const height = Math.round(vision.imageHeight * scale);
    const score = totalScore(state);

    const snapshot = await drawAsImage(
      createElement(VisionPicture, { image, width, height, order: revealOrder(vision.id), filled: score }),
      { width, height },
    );
    if (!snapshot) return;

    storage.set('snapshot', snapshot.encodeToBase64(ImageFormat.JPEG, 85));
    storage.set('score', Math.min(score, MAX_SCORE));
    storage.set('streak', streak(state));
    storage.set('summary', vision.summary);
    storage.set('lastRecord', lastRecordDate(state) ?? '');
    ExtensionStorage.reloadWidget();
  } catch (e) {
    console.warn('위젯 동기화 실패', e);
  }
}
