-- PostgreSQL 17 desechable: esquema mínimo equivalente para ensayar SQL90.
create role anon nologin;
create role authenticated nologin;
create schema if not exists auth;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create table public.bp_tournaments (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 format text not null,
 status text not null default 'registration_closed',
 is_published boolean not null default false,
 groups_published_at timestamptz,
 fixture_published_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.bp_tournament_groups (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.bp_tournaments(id) on delete cascade,
 group_number int not null,
 unique(tournament_id,group_number)
);
create table public.bp_tournament_pairs (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.bp_tournaments(id) on delete cascade,
 status text not null default 'approved',
 player1_name text not null,
 player2_name text not null,
 contact_phone text not null default 'NO-PUBLICAR'
);
create table public.bp_tournament_group_pairs (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.bp_tournaments(id) on delete cascade,
 group_id uuid not null references public.bp_tournament_groups(id) on delete cascade,
 pair_id uuid not null references public.bp_tournament_pairs(id) on delete cascade,
 unique(tournament_id,pair_id)
);
create table public.bp_tournament_group_matches (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.bp_tournaments(id) on delete cascade,
 group_id uuid not null references public.bp_tournament_groups(id) on delete cascade,
 match_status text not null default 'pending'
);
create table public.bp_tournament_match_results (
 match_id uuid primary key references public.bp_tournament_group_matches(id) on delete cascade,
 tournament_id uuid not null references public.bp_tournaments(id) on delete cascade,
 group_id uuid not null references public.bp_tournament_groups(id) on delete cascade,
 sets jsonb not null,
 sets_pair1 smallint not null,
 sets_pair2 smallint not null,
 winner_pair_id uuid not null,
 resolved_pair1_id uuid not null,
 resolved_pair2_id uuid not null,
 updated_at timestamptz not null default now()
);
create function public.bp_tournament_is_admin() returns boolean language sql stable security definer set search_path to '' as $$
 select auth.uid() = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid
$$;
create function public.bp_tournament_publish_group_fixture(p_tournament_id uuid) returns timestamptz
 language plpgsql security definer set search_path to '' as $$
declare v_time timestamptz;
begin
 if not public.bp_tournament_is_admin() then raise exception 'sin permiso' using errcode='42501';end if;
 update public.bp_tournaments t set fixture_published_at=now()
 where t.id=p_tournament_id and t.groups_published_at is not null and t.fixture_published_at is null
 returning fixture_published_at into v_time;
 if not found then raise exception 'no publicable';end if;
 return v_time;
end $$;
-- Tablas de reservas ficticias, aisladas de torneos.
create table public.reservations(id uuid primary key default gen_random_uuid(),description text);
create table public.fixed_turn_requests(id uuid primary key default gen_random_uuid(),description text);
create table public.blockouts(id uuid primary key default gen_random_uuid(),description text);
insert into public.reservations(description) values('Reserva ficticia: NO modificar');
insert into public.fixed_turn_requests(description) values('Turno fijo ficticio: NO modificar');
insert into public.blockouts(description) values('Bloqueo ficticio: NO modificar');
-- RPC expuestas desde public necesitan acceso al esquema sin exponer tablas.
grant usage on schema public,auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
grant execute on function public.bp_tournament_is_admin() to anon,authenticated;
grant execute on function public.bp_tournament_publish_group_fixture(uuid) to authenticated;