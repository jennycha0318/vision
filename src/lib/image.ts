import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

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
