import { useEffect, useMemo, useRef, useState } from 'react';

import { Colors, Radius } from '@/constants/theme';
import { GRID, revealOrder } from '@/lib/score';

type Props = {
  uri: string;
  seed: string;
  width: number;
  aspect: number;
  filled: number;
  fresh?: number;
  life?: number;
};

const FILL_MS = 1600;

/** object-fit: cover 처럼 그리기 */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function layer(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * 웹용 VisionCanvas. Skia 대신 2D 캔버스로 같은 연출을 한다.
 * - 흑백: 픽셀을 직접 바꿔 한 번만 만든다 (Safari 호환)
 * - 칸 마스크: 10×10 캔버스를 부드럽게 확대해 가장자리가 번지게 한다
 */
export function VisionCanvas({ uri, seed, width, aspect, filled, fresh = 0, life = 0 }: Props) {
  const height = Math.round(width * Math.min(Math.max(aspect, 0.6), 1.4));
  const order = useMemo(() => revealOrder(seed), [seed]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!uri) return;
    const el = new Image();
    el.onload = () => setImg(el);
    el.src = uri;
  }, [uri]);

  // 크기가 정해지면 흑백·컬러 레이어를 미리 만든다
  const layers = useMemo(() => {
    if (!img) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.round(width * dpr);
    const h = Math.round(height * dpr);

    const color = layer(w, h);
    drawCover(color.getContext('2d')!, img, w, h);

    const gray = layer(w, h);
    const g = gray.getContext('2d')!;
    g.drawImage(color, 0, 0);
    const data = g.getImageData(0, 0, w, h);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      // 채도를 빼고 살짝 밝혀 연필 스케치처럼
      const l = 0.25 * px[i] + 0.6 * px[i + 1] + 0.15 * px[i + 2];
      px[i] = Math.min(255, l * 0.9 + 26);
      px[i + 1] = Math.min(255, l * 0.9 + 23);
      px[i + 2] = Math.min(255, l * 0.9 + 18);
    }
    g.putImageData(data, 0, 0);

    return { w, h, color, gray, mask: layer(GRID, GRID), revealed: layer(w, h) };
  }, [img, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layers) return;
    const { w, h, color, gray, mask, revealed } = layers;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const m = mask.getContext('2d')!;
    const r = revealed.getContext('2d')!;

    const count = Math.min(filled, order.length);
    const alive = count >= 100 && life > 0;
    const start = performance.now();
    let raf = 0;
    let painted = -1;

    const paintMask = (freshAlpha: number) => {
      m.clearRect(0, 0, GRID, GRID);
      order.slice(0, count).forEach((cell, idx) => {
        m.globalAlpha = idx >= count - fresh ? freshAlpha : 1;
        m.fillStyle = '#fff';
        m.fillRect(cell % GRID, Math.floor(cell / GRID), 1, 1);
      });
      m.globalAlpha = 1;

      r.globalCompositeOperation = 'source-over';
      r.clearRect(0, 0, w, h);
      r.drawImage(color, 0, 0);
      r.globalCompositeOperation = 'destination-in';
      r.imageSmoothingEnabled = true;
      r.imageSmoothingQuality = 'high';
      if (count >= 100 && freshAlpha >= 1) r.fillRect(0, 0, w, h);
      else r.drawImage(mask, 0, 0, w, h); // 칸 중심 = 마스크 픽셀 중심
    };

    const frame = (now: number) => {
      const t = now - start;
      const fillT = fresh > 0 ? Math.min(1, t / FILL_MS) : 1;
      const eased = 1 - Math.pow(1 - fillT, 3);
      if (eased !== painted) {
        paintMask(eased);
        painted = eased;
      }

      ctx.save();
      ctx.clearRect(0, 0, w, h);
      if (alive) {
        const breath = (1 - Math.cos((t / 10400) * Math.PI * 2)) / 2;
        const s = 1 + breath * 0.025 * life;
        ctx.translate(w / 2, h / 2);
        ctx.scale(s, s);
        ctx.translate(-w / 2, -h / 2);
      }
      ctx.drawImage(gray, 0, 0);
      ctx.drawImage(revealed, 0, 0);
      ctx.restore();

      if (alive) {
        // 빛이 천천히 그림을 가로지른다
        const p = (t % 7000) / 7000;
        const x = -w + p * w * 2.2;
        const grad = ctx.createLinearGradient(x, 0, x + w * 0.6, h);
        grad.addColorStop(0.3, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, `rgba(255,244,214,${0.35 + 0.4 * life})`);
        grad.addColorStop(0.7, 'rgba(255,255,255,0)');
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
      }

      if (fillT < 1 || alive) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [layers, order, filled, fresh, life]);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: Radius.lg,
        overflow: 'hidden',
        background: Colors.line,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
        flexShrink: 0,
      }}>
      <canvas ref={canvasRef} style={{ width, height, display: 'block' }} />
    </div>
  );
}
