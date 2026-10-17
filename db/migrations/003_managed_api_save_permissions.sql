-- Rebind existing save permissions after replacing a manually-created role
-- with the authenticated role provisioned by the Neon Data API.
grant usage on schema public to authenticated;
grant select, insert, update on public.player_saves to authenticated;
grant select on public.player_request_identity to authenticated;
grant execute on function public.current_player_id() to authenticated;
alter policy "Players read only their own save" on public.player_saves to authenticated;
alter policy "Players create only their own save" on public.player_saves to authenticated;
alter policy "Players update only their own save" on public.player_saves to authenticated;
