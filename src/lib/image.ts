import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { IMAGE_BUCKET, supabase } from './supabase';

export type PickedImage = {
  uri: string;
  width: number;
  height: number;
};

export async function pickVisionImage(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/** 고른 이미지를 앱 문서 폴더로 복사해 영구 보관하고, 파일 이름을 돌려준다 */
export async function persistVisionImage(picked: PickedImage, visionId: string): Promise<string> {
  const ext = picked.uri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const name = `vision-${visionId}.${ext}`;
  const dest = new File(Paths.document, name);
  if (dest.exists) dest.delete();
  new File(picked.uri).copySync(dest);
  return name;
}

export function visionImageUri(fileName: string): string {
  return new File(Paths.document, fileName).uri;
}

// ───────────── Supabase Storage 동기화 ─────────────

const storagePath = (userId: string, fileName: string) => `${userId}/${fileName}`;

export async function uploadVisionImage(userId: string, fileName: string): Promise<void> {
  if (!supabase) return;
  const bytes = await new File(Paths.document, fileName).bytes();
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(storagePath(userId, fileName), bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`그림 업로드: ${error.message}`);
}

export async function ensureVisionImage(userId: string, fileName: string): Promise<void> {
  const local = new File(Paths.document, fileName);
  if (!supabase || local.exists) return;
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(storagePath(userId, fileName), 300);
  if (error || !data) throw new Error(`그림 내려받기: ${error?.message}`);
  await File.downloadFileAsync(data.signedUrl, local);
}
