-- Compatible addition: the existing private.oauth_credentials table remains unchanged.
-- These RPCs are restricted to the backend service role and never exposed to app users.
create or replace function public.store_oauth_credentials(p_platform_account_id uuid, p_access_token text, p_refresh_token text, p_token_type text, p_scopes text[], p_expires_at timestamptz, p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_platform_account_id is null or p_access_token is null then raise exception 'platform account and access token are required'; end if;
  insert into private.oauth_credentials (platform_account_id, access_token, refresh_token, token_type, scopes, expires_at, metadata, updated_at)
  values (p_platform_account_id, p_access_token, p_refresh_token, p_token_type, coalesce(p_scopes, '{}'::text[]), p_expires_at, coalesce(p_metadata, '{}'::jsonb), now())
  on conflict (platform_account_id) do update set access_token=excluded.access_token, refresh_token=coalesce(excluded.refresh_token, private.oauth_credentials.refresh_token), token_type=excluded.token_type, scopes=excluded.scopes, expires_at=excluded.expires_at, metadata=private.oauth_credentials.metadata || excluded.metadata, updated_at=now();
end; $$;
create or replace function public.get_oauth_credentials(p_platform_account_id uuid)
returns table (platform_account_id uuid, access_token text, refresh_token text, token_type text, scopes text[], expires_at timestamptz, metadata jsonb)
language sql security definer set search_path = '' stable as $$ select c.platform_account_id,c.access_token,c.refresh_token,c.token_type,c.scopes,c.expires_at,c.metadata from private.oauth_credentials c where c.platform_account_id=p_platform_account_id; $$;
create or replace function public.delete_oauth_credentials(p_platform_account_id uuid) returns void language sql security definer set search_path = '' as $$ delete from private.oauth_credentials where platform_account_id=p_platform_account_id; $$;
revoke all on function public.store_oauth_credentials(uuid,text,text,text,text[],timestamptz,jsonb) from public,anon,authenticated;
revoke all on function public.get_oauth_credentials(uuid) from public,anon,authenticated;
revoke all on function public.delete_oauth_credentials(uuid) from public,anon,authenticated;
grant execute on function public.store_oauth_credentials(uuid,text,text,text,text[],timestamptz,jsonb) to service_role;
grant execute on function public.get_oauth_credentials(uuid) to service_role;
grant execute on function public.delete_oauth_credentials(uuid) to service_role;
