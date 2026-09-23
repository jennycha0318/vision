import * as ImagePicker from 'expo-image-picker';
import { IMAGE_BUCKET, supabase } from './supabase';

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

// ───────────── Supabase Storage 동기화 ─────────────

const storagePath = (userId: string, fileName: string) => `${userId}/${fileName}`;

export async function uploadVisionImage(userId: string, fileName: string): Promise<void> {
  if (!supabase) return;
  const blob = await (await fetch(visionImageUri(fileName))).blob();
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(storagePath(userId, fileName), blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`그림 업로드: ${error.message}`);
}

/** 다른 기기나 브라우저에서 로그인했을 때, 서버의 그림을 받아 로컬에 둔다 */
export async function ensureVisionImage(userId: string, fileName: string): Promise<void> {
  if (!supabase || localStorage.getItem(KEY_PREFIX + fileName)) return;
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).download(storagePath(userId, fileName));
  if (error || !data) throw new Error(`그림 내려받기: ${error?.message}`);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(data);
  });
  localStorage.setItem(KEY_PREFIX + fileName, dataUrl);
}
