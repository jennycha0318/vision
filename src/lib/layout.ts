import { useWindowDimensions } from 'react-native';

/** 넓은 화면(데스크톱 브라우저)에서도 폰 너비로 보이게 하는 최대 폭 */
export const MAX_APP_WIDTH = 480;

export function useAppWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(width, MAX_APP_WIDTH);
}
