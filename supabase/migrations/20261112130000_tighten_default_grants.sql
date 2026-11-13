-- Supabase gives signed-in accounts every privilege on new tables and views
-- in the public schema. Row level security covers the tables, but
-- website_exhibitions is a view that reads with its owner's rights, so that
-- default would let any signed-in account change or remove listed
-- exhibitions through it. Leave only what each one is meant to allow.
revoke all on public.website_exhibitions from anon, authenticated;
grant select on public.website_exhibitions to anon, authenticated;

revoke all on public.ai_agent_actions from anon, authenticated;
grant select on public.ai_agent_actions to authenticated;
