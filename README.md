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
src/server/              서버 전용: claude.ts(Claude 호출), auth.ts(로그인 확인)
supabase/migrations/     DB 스키마 + RLS
api/index.js, vercel.json  Vercel 배포
src/components/          VisionCanvas — 네이티브는 Skia, 웹은 2D 캔버스(.web.tsx)
src/lib/
  score.ts                 점수 규칙 (감사 1, 행동 2, 하루 최대 3, 누적, 100칸 공개 순서)
  store.tsx                상태 관리. Supabase 있으면 클라우드, 없으면 기기에만 저장
  remote.ts / supabase.ts  Supabase 테이블 읽기·쓰기
  image(.web).ts           비전 그림 저장
  widget(.web).ts          iOS 위젯 동기화 (웹은 없음)
targets/widget/          iOS 위젯 (SwiftUI) — 나중에 네이티브 앱 만들 때 사용
```

## 로컬 실행

```bash
npm install
cp .env.example .env     # 키를 채운다. 비워두면 로컬 모드 + 기본 템플릿으로 동작
npx expo start --web
```

같은 와이파이의 아이폰에서 `http://<PC IP>:8081` 로 열어볼 수 있다.

## 배포 (GitHub → Vercel, 데이터는 Supabase)

GitHub `main`에 푸시하면 Vercel이 자동으로 빌드·배포한다 (`vercel.json`, `api/index.js`).

### Supabase (한 번만)
1. 새 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/20260923000000_init.sql` 실행 (테이블·RLS·그림 저장소)
3. Authentication → Emails → **Magic Link** 템플릿 본문에 `{{ .Token }}` 추가 (앱은 링크가 아니라 코드로 로그인)
4. Project Settings → API에서 URL과 publishable(anon) 키 확인

### Vercel (한 번만)
1. Add New → Project → GitHub `jennycha0318/vision` 가져오기 (Framework: Other, 설정은 vercel.json이 담당)
2. Environment Variables: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, `ANTHROPIC_API_KEY`
3. Deploy

배포된 주소를 아이폰 사파리에서 열고 **공유 → 홈 화면에 추가**. 이메일 코드로 로그인하면 기록은 Supabase에 저장된다.
Claude API 라우트는 로그인한 사용자만 호출할 수 있다.

`EXPO_PUBLIC_SUPABASE_*`가 없으면 로그인 없이 기기(localStorage)에만 저장하는 로컬 모드로 동작한다.

## iOS 앱 (나중에)

`app.json`에 `ios.appleTeamId`를 넣고 `eas build --profile development --platform ios`. 자세한 건 `targets/widget` 참고.
