revoke all on function my_org_id() from public;
grant execute on function my_org_id() to authenticated;

revoke all on function is_active_partner(uuid, uuid) from public;
grant execute on function is_active_partner(uuid, uuid) to authenticated;

revoke all on function can_view_catalog(uuid) from public;
grant execute on function can_view_catalog(uuid) to authenticated;
