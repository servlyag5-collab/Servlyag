-- Servly AG v27: admins can open ANY listing (turned off, paused, or with an ended plan) from Admin.
-- Customers and merchants are not affected: they still only see live listings (and merchants their own).
-- The listing page shows admins a banner saying why customers can't see it.
-- Paste into Supabase > SQL Editor > Run (after v26). No tables change, no data is removed.

create policy "admins read all services" on public.services for select to authenticated
  using (public.is_admin());
