create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;

with ranked_usernames as (
  select
    id,
    lower(btrim(raw_user_meta_data ->> 'username')) as username,
    row_number() over (
      partition by lower(btrim(raw_user_meta_data ->> 'username'))
      order by created_at, id
    ) as username_rank
  from auth.users
  where nullif(btrim(raw_user_meta_data ->> 'username'), '') is not null
)
insert into public.profiles (id, username)
select id, username
from ranked_usernames
where username_rank = 1
on conflict (id) do nothing;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.is_username_available(requested_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    requested_username is not null
    and char_length(btrim(requested_username)) between 3 and 254
    and not exists (
      select 1
      from public.profiles
      where lower(username) = lower(btrim(requested_username))
    );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_username text := nullif(lower(btrim(new.raw_user_meta_data ->> 'username')), '');
begin
  if new_username is not null then
    insert into public.profiles (id, username)
    values (new.id, new_username);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_username on auth.users;
create trigger on_auth_user_created_username
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
