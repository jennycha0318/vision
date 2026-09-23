import { BlurMask, ColorMatrix, Group, Image, Mask, Rect, type SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import { GRID } from '@/lib/score';

// 채도를 뺀 뒤 살짝 밝혀서 연필 스케치처럼 보이게 한다
const PENCIL = [
  0.25, 0.6, 0.15, 0, 0.1,
  0.25, 0.6, 0.15, 0, 0.09,
  0.25, 0.6, 0.15, 0, 0.07,
  0, 0, 0, 1, 0,
];

type Props = {
  image: SkImage;
  width: number;
  height: number;
  /** 칸이 채워지는 순서 (revealOrder) */
  order: number[];
  /** 채워진 칸 수 = 점수 */
  filled: number;
  /** filled 중 이번에 새로 채워지는 칸 수. 이 칸들만 newOpacity로 번진다 */
  fresh?: number;
  newOpacity?: SharedValue<number>;
};

/**
 * 흑백 그림 위에 채워진 칸만큼 컬러 그림을 드러낸다.
 * Canvas 안(화면)과 drawAsImage(위젯 스냅샷) 양쪽에서 쓴다.
 */
export function VisionPicture({ image, width, height, order, filled, fresh = 0, newOpacity }: Props) {
  const cw = width / GRID;
  const ch = height / GRID;
  const blur = Math.min(cw, ch) * 0.45;
  const pad = blur * 0.9; // 흐린 가장자리끼리 겹쳐 이음매가 보이지 않게

  const count = Math.min(filled, order.length);
  const complete = count >= order.length && fresh === 0;
  const settled = order.slice(0, count - fresh);
  const incoming = order.slice(count - fresh, count);

  const cell = (i: number) => (
    <Rect
      key={i}
      x={(i % GRID) * cw - pad}
      y={Math.floor(i / GRID) * ch - pad}
      width={cw + pad * 2}
      height={ch + pad * 2}
      color="white">
      <BlurMask blur={blur} style="normal" />
    </Rect>
  );

  return (
    <Group>
      <Image image={image} x={0} y={0} width={width} height={height} fit="cover">
        <ColorMatrix matrix={PENCIL} />
      </Image>
      {count > 0 && (
        <Mask
          mode="alpha"
          mask={
            <Group>
              {complete ? <Rect x={0} y={0} width={width} height={height} color="white" /> : settled.map(cell)}
              {incoming.length > 0 && <Group opacity={newOpacity ?? 1}>{incoming.map(cell)}</Group>}
            </Group>
          }>
          <Image image={image} x={0} y={0} width={width} height={height} fit="cover" />
        </Mask>
      )}
    </Group>
  );
}
