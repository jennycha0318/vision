import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// 웹 전용 HTML 뼈대. 아이폰 사파리에서 "홈 화면에 추가"하면 앱처럼 전체 화면으로 열린다.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <title>비전 보드</title>
        <meta name="theme-color" content="#FBF8F3" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="비전 보드" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html, body { background: #FBF8F3; } body { overscroll-behavior: none; }' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
