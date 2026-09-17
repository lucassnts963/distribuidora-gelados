-- Supabase concede EXECUTE a anon/authenticated por default privilege no schema public,
-- nao so via PUBLIC pseudo-role — revoke explicito por role e o que realmente bloqueia.
revoke execute on function my_org_id() from anon;
revoke execute on function is_active_partner(uuid, uuid) from anon;
revoke execute on function can_view_catalog(uuid) from anon;
revoke execute on function available_stock(uuid) from anon;
revoke execute on function lookup_org_by_invite_code(text) from anon;
