-- role e org_id passam a ser graváveis só pela service role. RLS não
-- restringe coluna, e a policy de update de profiles é "minha própria
-- linha" — sem isso qualquer usuário logado podia se promover a admin ou
-- mover o próprio org_id para dentro de outro tenant.
revoke update on profiles from authenticated, anon;
grant update (full_name) on profiles to authenticated;

-- Onboarding sai do client: criar organização + o próprio profile vira uma
-- operação atômica com privilégio controlado, em vez de dois inserts soltos
-- sob uma policy que aceitava qualquer org_id.
create or replace function create_organization(p_name text, p_document text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'sem sessão';
  end if;
  if exists (select 1 from profiles where id = (select auth.uid())) then
    raise exception 'usuário já pertence a uma organização';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'informe o nome da organização';
  end if;

  insert into organizations (name, document)
  values (trim(p_name), nullif(trim(coalesce(p_document, '')), ''))
  returning id into new_org;

  insert into profiles (id, org_id, role, full_name)
  values (
    (select auth.uid()),
    new_org,
    'admin',
    (select email from auth.users where id = (select auth.uid()))
  );

  return new_org;
end;
$$;

revoke all on function create_organization(text, text) from public, anon;
grant execute on function create_organization(text, text) to authenticated;

drop policy if exists profiles_insert on profiles;
revoke insert on profiles from authenticated, anon;
