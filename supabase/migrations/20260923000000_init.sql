-- 비전 보드 초기 스키마. Supabase 대시보드 → SQL Editor에 붙여넣어 실행한다.

create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  age_group text not null,
  gender text not null,
  updated_at timestamptz not null default now()
);

create table public.visions (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  start_date date not null,
  answers jsonb not null,
  summary text not null,
  image_prompt text not null,
  image_file text not null,
  image_width int not null,
  image_height int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index visions_user_active on public.visions (user_id) where is_active;

-- 감사/행동 한 줄 = 한 행. 점수는 날짜별 칸 단위로 앱에서 계산한다
create table public.entries (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  kind text not null check (kind in ('gratitude', 'action')),
  text text not null,
  created_at timestamptz not null default now()
);
create index entries_user_date on public.entries (user_id, date);

-- "오늘은 쉬어갈게요"를 누른 날
create table public.rest_days (
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  primary key (user_id, date)
);

alter table public.profiles enable row level security;
alter table public.visions enable row level security;
alter table public.entries enable row level security;
alter table public.rest_days enable row level security;

create policy "own profile" on public.profiles for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own visions" on public.visions for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own entries" on public.entries for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rest days" on public.rest_days for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 비전 그림: 비공개 버킷, <user_id>/<파일> 경로만 본인이 접근
insert into storage.buckets (id, name, public) values ('vision-images', 'vision-images', false);

create policy "own vision images" on storage.objects for all to authenticated
  using (bucket_id = 'vision-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vision-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
