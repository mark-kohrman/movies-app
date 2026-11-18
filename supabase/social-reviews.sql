alter table public.movie_ratings
  add column if not exists is_private boolean not null default true;

alter table public.movie_ratings
  alter column is_private set default false;

create table if not exists public.movie_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index if not exists movie_connections_user_pair_unique
  on public.movie_connections (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists movie_connections_addressee_status_idx
  on public.movie_connections (addressee_id, status);

alter table public.movie_connections enable row level security;
revoke all on table public.movie_connections from anon, authenticated;
grant select on table public.movie_connections to authenticated;

drop policy if exists "Users can view their own movie connections"
  on public.movie_connections;
create policy "Users can view their own movie connections"
  on public.movie_connections
  for select
  to authenticated
  using (
    (select auth.uid()) = requester_id
    or (select auth.uid()) = addressee_id
  );

create table if not exists public.movie_rating_comments (
  id uuid primary key default gen_random_uuid(),
  rating_user_id uuid not null,
  movie_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key (rating_user_id, movie_id)
    references public.movie_ratings (user_id, movie_id)
    on delete cascade
);

create index if not exists movie_rating_comments_rating_created_idx
  on public.movie_rating_comments (rating_user_id, movie_id, created_at);

alter table public.movie_rating_comments enable row level security;
revoke all on table public.movie_rating_comments from anon, authenticated;
grant select, insert, delete on table public.movie_rating_comments to authenticated;

drop policy if exists "Users can view comments on visible ratings"
  on public.movie_rating_comments;
create policy "Users can view comments on visible ratings"
  on public.movie_rating_comments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.movie_ratings r
      where r.user_id = rating_user_id
        and r.movie_id = public.movie_rating_comments.movie_id
    )
  );

drop policy if exists "Connections can comment on shared ratings"
  on public.movie_rating_comments;
create policy "Connections can comment on shared ratings"
  on public.movie_rating_comments
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and rating_user_id <> (select auth.uid())
    and exists (
      select 1
      from public.movie_ratings r
      join public.movie_connections c
        on c.status = 'accepted'
       and (
         (c.requester_id = r.user_id and c.addressee_id = (select auth.uid()))
         or
         (c.addressee_id = r.user_id and c.requester_id = (select auth.uid()))
       )
      where r.user_id = rating_user_id
        and r.movie_id = movie_rating_comments.movie_id
        and r.is_private = false
    )
  );

drop policy if exists "Comment authors and rating owners can delete comments"
  on public.movie_rating_comments;
create policy "Comment authors and rating owners can delete comments"
  on public.movie_rating_comments
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or rating_user_id = (select auth.uid())
  );

drop policy if exists "Users can read their own movie ratings"
  on public.movie_ratings;
drop policy if exists "Users can read their own and shared movie ratings"
  on public.movie_ratings;
create policy "Users can read their own and shared movie ratings"
  on public.movie_ratings
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      is_private = false
      and exists (
        select 1
        from public.movie_connections c
        where c.status = 'accepted'
          and (
            (c.requester_id = user_id and c.addressee_id = (select auth.uid()))
            or
            (c.addressee_id = user_id and c.requester_id = (select auth.uid()))
          )
      )
    )
  );

create or replace function public.request_movie_connection(target_username text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_user_id uuid;
  new_connection_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in to connect with another user.';
  end if;

  if target_username is null or char_length(btrim(target_username)) not between 3 and 254 then
    raise exception 'Enter a valid username.';
  end if;

  select p.id
    into target_user_id
  from public.profiles p
  where lower(p.username) = lower(btrim(target_username))
  limit 1;

  if target_user_id is null then
    raise exception 'No user was found with that username.';
  end if;

  if target_user_id = current_user_id then
    raise exception 'You cannot connect with your own account.';
  end if;

  if exists (
    select 1
    from public.movie_connections c
    where least(c.requester_id, c.addressee_id)
            = least(current_user_id, target_user_id)
      and greatest(c.requester_id, c.addressee_id)
            = greatest(current_user_id, target_user_id)
  ) then
    raise exception 'A connection or pending request already exists for that user.';
  end if;

  insert into public.movie_connections (requester_id, addressee_id)
  values (current_user_id, target_user_id)
  returning id into new_connection_id;

  return new_connection_id;
end;
$$;

create or replace function public.respond_to_movie_connection(
  requested_connection_id uuid,
  accept_request boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Sign in to manage connections.';
  end if;

  if accept_request then
    update public.movie_connections
    set status = 'accepted', updated_at = now()
    where id = requested_connection_id
      and addressee_id = current_user_id
      and status = 'pending';

    if not found then
      raise exception 'That connection request is no longer available.';
    end if;
  else
    delete from public.movie_connections
    where id = requested_connection_id
      and addressee_id = current_user_id
      and status = 'pending';

    if not found then
      raise exception 'That connection request is no longer available.';
    end if;
  end if;
end;
$$;

create or replace function public.remove_movie_connection(
  requested_connection_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to manage connections.';
  end if;

  delete from public.movie_connections
  where id = requested_connection_id
    and (
      requester_id = auth.uid()
      or addressee_id = auth.uid()
    );

  if not found then
    raise exception 'That connection could not be found.';
  end if;
end;
$$;

create or replace function public.list_movie_connections()
returns table (
  connection_id uuid,
  other_user_id uuid,
  other_username text,
  status text,
  direction text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    case
      when c.requester_id = auth.uid() then c.addressee_id
      else c.requester_id
    end,
    coalesce(p.username, 'Movie fan'),
    c.status,
    case
      when c.requester_id = auth.uid() then 'outgoing'
      else 'incoming'
    end,
    c.created_at
  from public.movie_connections c
  left join public.profiles p
    on p.id = case
      when c.requester_id = auth.uid() then c.addressee_id
      else c.requester_id
    end
  where auth.uid() is not null
    and (c.requester_id = auth.uid() or c.addressee_id = auth.uid())
  order by c.created_at desc;
$$;

create or replace function public.list_shared_movie_reviews()
returns table (
  user_id uuid,
  username text,
  movie_id text,
  movie_title text,
  movie_year text,
  rating numeric,
  review text,
  updated_at timestamptz,
  comments jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.user_id,
    coalesce(p.username, 'Movie fan'),
    r.movie_id,
    r.movie_title,
    r.movie_year,
    r.rating,
    r.review,
    r.updated_at,
    comments.items
  from public.movie_ratings r
  join public.movie_connections c
    on c.status = 'accepted'
   and (
     (c.requester_id = r.user_id and c.addressee_id = auth.uid())
     or
     (c.addressee_id = r.user_id and c.requester_id = auth.uid())
   )
  left join public.profiles p on p.id = r.user_id
   cross join lateral (
     select coalesce(
       jsonb_agg(
         jsonb_build_object(
           'id', cm.id,
           'user_id', cm.user_id,
           'username', coalesce(cp.username, 'Movie fan'),
           'body', cm.body,
           'created_at', cm.created_at
         )
         order by cm.created_at
       ),
       '[]'::jsonb
     ) as items
     from public.movie_rating_comments cm
     left join public.profiles cp on cp.id = cm.user_id
     where cm.rating_user_id = r.user_id
       and cm.movie_id = r.movie_id
   ) comments
  where auth.uid() is not null
    and r.user_id <> auth.uid()
    and r.is_private = false
    and nullif(btrim(r.review), '') is not null
  order by r.updated_at desc;
$$;

create or replace function public.list_my_movie_ratings()
returns table (
  movie_id text,
  movie_title text,
  movie_year text,
  rating numeric,
  review text,
  is_private boolean,
  updated_at timestamptz,
  comments jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.movie_id,
    r.movie_title,
    r.movie_year,
    r.rating,
    r.review,
    r.is_private,
    r.updated_at,
    comments.items
  from public.movie_ratings r
  cross join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', cm.id,
          'user_id', cm.user_id,
          'username', coalesce(cp.username, 'Movie fan'),
          'body', cm.body,
          'created_at', cm.created_at
        )
        order by cm.created_at
      ),
      '[]'::jsonb
    ) as items
    from public.movie_rating_comments cm
    left join public.profiles cp on cp.id = cm.user_id
    where cm.rating_user_id = r.user_id
      and cm.movie_id = r.movie_id
  ) comments
  where auth.uid() is not null
    and r.user_id = auth.uid()
  order by r.updated_at desc;
$$;

create or replace function public.get_my_movie_username()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.username
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.set_my_movie_username(requested_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_username text := lower(btrim(requested_username));
begin
  if current_user_id is null then
    raise exception 'Sign in to set your username.';
  end if;

  if requested_username is null
    or normalized_username !~ '^[a-z0-9_]{3,24}$'
  then
    raise exception 'Use 3–24 lowercase letters, numbers, or underscores.';
  end if;

  insert into public.profiles (id, username)
  values (current_user_id, normalized_username)
  on conflict (id) do update
    set username = excluded.username;

  return normalized_username;
exception
  when unique_violation then
    raise exception 'That username is already taken. Choose another.';
end;
$$;

revoke all on function public.request_movie_connection(text) from public;
revoke all on function public.respond_to_movie_connection(uuid, boolean) from public;
revoke all on function public.remove_movie_connection(uuid) from public;
revoke all on function public.list_movie_connections() from public;
revoke all on function public.list_shared_movie_reviews() from public;
revoke all on function public.list_my_movie_ratings() from public;
revoke all on function public.get_my_movie_username() from public;
revoke all on function public.set_my_movie_username(text) from public;

grant execute on function public.request_movie_connection(text) to authenticated;
grant execute on function public.respond_to_movie_connection(uuid, boolean) to authenticated;
grant execute on function public.remove_movie_connection(uuid) to authenticated;
grant execute on function public.list_movie_connections() to authenticated;
grant execute on function public.list_shared_movie_reviews() to authenticated;
grant execute on function public.list_my_movie_ratings() to authenticated;
grant execute on function public.get_my_movie_username() to authenticated;
grant execute on function public.set_my_movie_username(text) to authenticated;
