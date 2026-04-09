-- Fix infinite recursion on org_members
drop policy if exists "Members can view org members" on public.org_members;
create policy "Members can view org members" on public.org_members for select using (true);
