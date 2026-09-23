# 비전 보드 (MVP)

비전 그림을 흑백에서 컬러로 채워가는 감사·행동 기록 앱.
지금은 **웹앱**으로 먼저 써보고, 이후 **앱인토스(WebView)** 로 옮길 계획. 같은 Expo 코드로 iOS 앱(위젯 포함)도 빌드할 수 있다.

## 구조

```
src/app/                 화면 (expo-router)
  onboarding.tsx           나이대·성별 (한 번만)
  vision.tsx               비전 5문항 → 프롬프트 → ChatGPT로 그림 생성 → 그림 고르기
  (tabs)/index.tsx         오늘: 비전 그림 · 진행도 · 감사 · 행동 · 기록
  (tabs)/history.tsx       히스토리
  (tabs)/profile.tsx       프로필
  api/vision+api.ts        서버: 비전 → 이미지 프롬프트 (Claude)
  api/suggest+api.ts       서버: 오늘의 행동 제안 (Claude)
src/server/claude.ts     Claude 호출 (서버 전용, API 키는 여기서만 사용)
src/components/          VisionCanvas — 네이티브는 Skia, 웹은 2D 캔버스(.web.tsx)
src/lib/
  score.ts                 점수 규칙 (감사 1, 행동 2, 하루 최대 3, 누적, 100칸 공개 순서)
  store.tsx                로컬 저장 (웹: localStorage)
  image(.web).ts           비전 그림 저장
  widget(.web).ts          iOS 위젯 동기화 (웹은 없음)
targets/widget/          iOS 위젯 (SwiftUI) — 나중에 네이티브 앱 만들 때 사용
```

## 로컬 실행

```bash
npm install
cp .env.example .env     # ANTHROPIC_API_KEY 입력 (없으면 기본 템플릿으로 동작)
npx expo start --web
```

같은 와이파이의 아이폰에서 `http://<PC IP>:8081` 로 열어볼 수 있다.

## 배포 (EAS Hosting)

```bash
npm install -g eas-cli
eas login
npx expo export --platform web
eas deploy --prod
eas env:create --name ANTHROPIC_API_KEY --environment production --visibility secret
```

배포된 주소를 아이폰 사파리에서 열고 **공유 → 홈 화면에 추가**. 기록은 그 브라우저에 저장되므로 항상 홈 화면 아이콘으로 연다
(사파리 탭으로만 쓰면 오래 안 쓸 때 저장소가 지워질 수 있다).

## iOS 앱 (나중에)

`app.json`에 `ios.appleTeamId`를 넣고 `eas build --profile development --platform ios`. 자세한 건 `targets/widget` 참고.
