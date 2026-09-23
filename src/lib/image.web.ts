import * as ImagePicker from 'expo-image-picker';

import type { PickedImage } from './image';

export type { PickedImage } from './image';

const KEY_PREFIX = 'vision-board/image/';
// localStorage 한도(약 5MB) 안에 넉넉히 들어가도록 줄여서 저장한다
const MAX_SIDE = 1200;

export async function pickVisionImage(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled || !result.assets[0]) return null;
  const { uri, width, height } = result.assets[0];
  return { uri, width, height };
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = uri;
  });
}

/** 이미지를 줄여 JPEG data URL로 만들어 브라우저 저장소에 보관하고, 키를 돌려준다 */
export async function persistVisionImage(picked: PickedImage, visionId: string): Promise<string> {
  const img = await loadImage(picked.uri);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  // 이전 비전 이미지는 지워 공간을 비운다
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith(KEY_PREFIX)) localStorage.removeItem(k);
  }
  const name = `vision-${visionId}`;
  localStorage.setItem(KEY_PREFIX + name, dataUrl);
  return name;
}

export function visionImageUri(fileName: string): string {
  return localStorage.getItem(KEY_PREFIX + fileName) ?? '';
}
