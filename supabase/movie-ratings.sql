create table if not exists public.movie_ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  movie_id text not null,
  movie_title text not null,
  movie_year text not null default '',
  poster_url text,
  rating numeric(2, 1) not null check (rating >= 0 and rating <= 5),
  review text check (review is null or char_length(review) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id),
  check (rating * 10 = trunc(rating * 10))
);

alter table public.movie_ratings enable row level security;

drop policy if exists "Users can read their own movie ratings"
  on public.movie_ratings;
drop policy if exists "Users can insert their own movie ratings"
  on public.movie_ratings;
drop policy if exists "Users can update their own movie ratings"
  on public.movie_ratings;

create policy "Users can read their own movie ratings"
  on public.movie_ratings
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own movie ratings"
  on public.movie_ratings
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own movie ratings"
  on public.movie_ratings
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
