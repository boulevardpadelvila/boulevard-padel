-- Ejecutar luego de bootstrap.sql, SQL90 y generación de planes, MISMA BD desechable.
set client_min_messages to warning;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',false);
do $$
declare n integer;g integer;i integer;v_n integer;v_four integer;v_group_count integer;
v_t uuid;v_g uuid;v_pair uuid;v_size int;v_result jsonb;v_expected int;
begin
 for n in 6..40 loop
   v_t:=('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
   insert into public.bp_tournaments(id,name,format,status,groups_published_at)
   values(v_t,'Ensayo '||n,'groups_knockout','registration_closed',now());
   v_group_count:=floor(n/3.0)::int;v_four:=n%3;v_n:=0;
   for g in 1..v_group_count loop
     v_g:=md5('group:'||n||':'||g)::uuid;
     insert into public.bp_tournament_groups(id,tournament_id,group_number) values(v_g,v_t,g);
     v_size:=case when g<=v_four then 4 else 3 end;
     for i in 1..v_size loop
       v_n:=v_n+1;v_pair:=md5('pair:'||n||':'||v_n)::uuid;
       insert into public.bp_tournament_pairs(id,tournament_id,player1_name,player2_name)
       values(v_pair,v_t,'Jugador '||v_n,'Pareja '||v_n);
       insert into public.bp_tournament_group_pairs(tournament_id,group_id,pair_id) values(v_t,v_g,v_pair);
     end loop;
   end loop;
   select public.bp_tournament_publish_fixture2026(v_t,p.plan) into v_result
   from public._t90_plans p where p.n=v_n;
   select (p.plan->>'qualified')::int-1 into v_expected from public._t90_plans p where p.n=v_n;
   if (select count(*) from public.bp_tournament_bracket_matches2026 m where m.tournament_id=v_t)<>v_expected then
     raise exception 'n=%, partidos eliminatorios mal generados',n;
   end if;
   if (select fixture_published_at is null from public.bp_tournaments where id=v_t) then
     raise exception 'n=%, no se publicó fixture',n;
   end if;
 end loop;
end $$;
-- Público no debe ver el torneo borrador ni teléfonos.
select set_config('request.jwt.claim.sub','',false);
do $$ begin
 if public.bp_tournament_bracket_report2026('00000000-0000-4000-8000-000000000009') is not null then
  raise exception '¡Fuga del cuadro no publicado!';end if;
end $$;
-- Simular publicación oficial y verificar el reporte sanitizado.
update public.bp_tournaments set is_published=true where name='Ensayo 9';
do $$ declare report jsonb; begin
 report:=public.bp_tournament_bracket_report2026('00000000-0000-4000-8000-000000000009');
 if report is null or jsonb_array_length(report->'matches')<>5 then
   raise exception 'Reporte público incompleto';end if;
 if report::text like '%NO-PUBLICAR%' then raise exception 'Fuga de teléfono';end if;
end $$;
-- Sin tocar reservas ni turnos fijos.
do $$ begin
 if (select count(*) from public.reservations)<>1 or (select count(*) from public.fixed_turn_requests)<>1
  or (select count(*) from public.blockouts)<>1 then raise exception 'Regresión reservas';end if;
end $$;
-- No permite crear llaves sin sesión de administrador.
do $$ begin
 begin
   perform public.bp_tournament_publish_fixture2026('00000000-0000-4000-8000-000000000009','{}'::jsonb);
   raise exception 'Se permitió operación sin administrador';
 exception when insufficient_privilege then null; end;
end $$;
select 'SQL90 OK: 35 estructuras, consulta pública, permisos y reservas intactas' as resultado;