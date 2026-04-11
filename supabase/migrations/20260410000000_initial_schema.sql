-- ============================================================
-- HOUSPIRE STAGING MODULE — INITIAL SCHEMA
-- Run: npx supabase db push
-- ============================================================

-- ─── PROFILES (extends auth.users) ──────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'senior', 'junior', 'viewer')) default 'junior',
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ─── PROJECTS ────────────────────────────────────────────────
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  client_name text not null,
  client_whatsapp text not null,
  client_email text,
  city text not null check (city in ('Hyderabad', 'Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Chennai')),
  project_type text not null check (project_type in ('New Flat', 'Renovation', 'Builder Unit', 'Office')),
  occupant_profile text not null check (occupant_profile in (
    'Single Professional', 'Young Couple', 'Family with Children',
    'Multi-Generational', 'Elderly', 'Corporate'
  )),
  budget_bracket text not null check (budget_bracket in ('economy', 'standard', 'premium', 'luxury')),
  primary_style text not null,
  vastu_required text not null check (vastu_required in ('Yes', 'No', 'Partial')) default 'No',
  vastu_notes text,
  style_preferences text,
  material_preferences text,
  exclusions text,
  assigned_to uuid references public.profiles(id),
  status text not null default 'intake' check (status in (
    'intake', 'shell_ready', 'style_set', 'staging',
    'client_review', 'revisions', 'delivered'
  )),
  priority text not null default 'Normal' check (priority in ('Normal', 'High', 'Urgent')),
  sla_deadline timestamptz not null,
  created_at timestamptz default now(),
  delivered_at timestamptz,
  is_late_delivery boolean default false,
  revision_limit integer default 2,
  total_api_cost numeric(10,2) default 0,
  project_style_anchor jsonb
);

-- ─── ROOMS ───────────────────────────────────────────────────
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  room_name text not null,
  room_type text not null check (room_type in (
    'Living', 'Master Bedroom', 'Bedroom 2', 'Kitchen',
    'Dining', 'Study', 'Office', 'Bathroom', 'Balcony', 'Other'
  )),
  dimensions_l numeric(5,1),
  dimensions_w numeric(5,1),
  dimensions_h numeric(5,1),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'delivered')),
  current_pass integer default 0,
  style_seed_id uuid,
  spatial_analysis jsonb,
  colour_palette jsonb,
  enhanced_shell_url text,
  original_shell_url text,
  created_at timestamptz default now()
);

-- ─── RENDERS ─────────────────────────────────────────────────
create table public.renders (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  pass_number integer not null,
  pass_type text not null check (pass_type in (
    'shell_enhancement', 'spatial_analysis', 'style_seed', 'flooring',
    'main_furniture', 'accent_pieces', 'lighting', 'decor',
    'revision', 'day_to_dusk', 'surface_swap'
  )),
  variation_label text check (variation_label in ('A', 'B', 'C')),
  resolution_tier text not null check (resolution_tier in ('1K', '2K', '4K')),
  storage_url text not null,
  watermarked_url text,
  thumbnail_url text,
  status text not null default 'generated' check (status in (
    'generated', 'team_approved', 'client_approved', 'rejected', 'not_selected'
  )),
  prompt_used text,
  references_used jsonb,
  artifact_flags jsonb,
  api_cost numeric(8,4) default 0,
  created_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id)
);

-- ─── CHECKPOINTS ─────────────────────────────────────────────
create table public.checkpoints (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  checkpoint_number integer not null check (checkpoint_number in (1, 2, 3)),
  status text not null default 'pending' check (status in ('pending', 'shared', 'approved')),
  shared_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  share_link_id uuid,
  client_notes text,
  team_notes text,
  unique(room_id, checkpoint_number)
);

-- ─── REVISIONS ───────────────────────────────────────────────
create table public.revisions (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  revision_number integer not null,
  brief text not null,
  element_tags jsonb not null default '[]',
  base_render_id uuid references public.renders(id),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz default now(),
  created_by uuid references public.profiles(id),
  completed_at timestamptz
);

-- ─── GENERATION QUEUE ────────────────────────────────────────
create table public.generation_queue (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade not null,
  pass_number integer not null,
  pass_type text not null,
  variation_count integer default 1 check (variation_count in (1, 2, 3)),
  prompt text not null,
  reference_urls jsonb not null default '[]',
  resolution_tier text not null check (resolution_tier in ('1K', '2K', '4K')),
  priority integer not null default 3 check (priority in (1, 2, 3)),
  status text not null default 'pending' check (status in ('pending', 'processing', 'complete', 'failed')),
  queued_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  api_cost numeric(8,4),
  requested_by uuid references public.profiles(id)
);

-- ─── SHARE LINKS ─────────────────────────────────────────────
create table public.share_links (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade,
  render_id uuid references public.renders(id) on delete cascade,
  checkpoint_number integer,
  url_token text unique not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  opened_at timestamptz,
  is_revoked boolean default false,
  is_presentation_mode boolean default false
);

-- ─── PROMPT TEMPLATES ────────────────────────────────────────
create table public.prompt_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  room_type text not null,
  style text not null,
  city text,
  pass_number integer not null,
  instruction text not null,
  usage_count integer default 0,
  zero_revision_count integer default 0,
  success_rate numeric(4,2) default 0,
  created_by uuid references public.profiles(id),
  updated_at timestamptz default now(),
  is_active boolean default true
);

-- ─── STYLE VAULT ─────────────────────────────────────────────
create table public.style_vault (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  thumbnail_url text,
  style_name text not null,
  room_type text not null,
  city text,
  budget_bracket text,
  material_family text,
  colour_family text,
  usage_count integer default 0,
  source_project_id uuid references public.projects(id),
  created_at timestamptz default now(),
  created_by uuid references public.profiles(id),
  tags jsonb default '[]'
);

-- ─── FURNITURE REFERENCES ────────────────────────────────────
create table public.furniture_references (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  thumbnail_url text,
  category text not null,
  sub_category text not null,
  style_tags jsonb default '[]',
  material_tags jsonb default '[]',
  colour_family text,
  recommended_rooms jsonb default '[]',
  recommended_budgets jsonb default '[]',
  usage_count integer default 0,
  added_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ─── ACTIVITY LOG ────────────────────────────────────────────
create table public.activity_log (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references public.profiles(id),
  action_type text not null,
  action_description text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ─── TEAM COMMENTS ───────────────────────────────────────────
create table public.team_comments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  mentioned_users jsonb default '[]',
  created_at timestamptz default now(),
  edited_at timestamptz
);

-- ─── API COST LOG ────────────────────────────────────────────
create table public.api_cost_log (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade,
  call_type text not null check (call_type in ('generation', 'vision', 'enhancement')),
  resolution_tier text,
  cost_inr numeric(8,4) not null,
  gemini_model text not null,
  created_at timestamptz default now()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.rooms enable row level security;
alter table public.renders enable row level security;
alter table public.checkpoints enable row level security;
alter table public.revisions enable row level security;
alter table public.generation_queue enable row level security;
alter table public.share_links enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.style_vault enable row level security;
alter table public.furniture_references enable row level security;
alter table public.activity_log enable row level security;
alter table public.team_comments enable row level security;
alter table public.api_cost_log enable row level security;
alter table public.notifications enable row level security;

-- Helper: get current user's role (used in RLS policies)
create or replace function public.get_my_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- ─── PROFILES ────────────────────────────────────────────────
create policy "profiles_select" on public.profiles for select using (auth.uid() is not null);
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());
create policy "profiles_insert_admin" on public.profiles for insert with check (public.get_my_role() = 'admin');

-- ─── PROJECTS ────────────────────────────────────────────────
create policy "projects_select" on public.projects for select using (auth.uid() is not null);
create policy "projects_insert" on public.projects for insert with check (public.get_my_role() in ('admin', 'senior'));
create policy "projects_update" on public.projects for update using (
  public.get_my_role() in ('admin', 'senior') or assigned_to = auth.uid()
);

-- ─── ROOMS ───────────────────────────────────────────────────
create policy "rooms_select" on public.rooms for select using (auth.uid() is not null);
create policy "rooms_insert" on public.rooms for insert with check (public.get_my_role() in ('admin', 'senior', 'junior'));
create policy "rooms_update" on public.rooms for update using (public.get_my_role() in ('admin', 'senior', 'junior'));

-- ─── RENDERS ─────────────────────────────────────────────────
create policy "renders_select" on public.renders for select using (auth.uid() is not null);
create policy "renders_insert" on public.renders for insert with check (public.get_my_role() in ('admin', 'senior', 'junior'));
create policy "renders_update" on public.renders for update using (public.get_my_role() in ('admin', 'senior'));

-- ─── CHECKPOINTS ─────────────────────────────────────────────
create policy "checkpoints_select" on public.checkpoints for select using (auth.uid() is not null);
create policy "checkpoints_all" on public.checkpoints for all using (public.get_my_role() in ('admin', 'senior'));

-- ─── REVISIONS ───────────────────────────────────────────────
create policy "revisions_select" on public.revisions for select using (auth.uid() is not null);
create policy "revisions_write" on public.revisions for all using (public.get_my_role() in ('admin', 'senior', 'junior'));

-- ─── GENERATION QUEUE ────────────────────────────────────────
create policy "generation_queue_select" on public.generation_queue for select using (auth.uid() is not null);
create policy "generation_queue_insert" on public.generation_queue for insert with check (public.get_my_role() in ('admin', 'senior', 'junior'));
create policy "generation_queue_update" on public.generation_queue for update using (public.get_my_role() in ('admin', 'senior'));

-- ─── SHARE LINKS ─────────────────────────────────────────────
create policy "share_links_select" on public.share_links for select using (auth.uid() is not null);
create policy "share_links_all" on public.share_links for all using (public.get_my_role() in ('admin', 'senior'));

-- ─── LIBRARIES ───────────────────────────────────────────────
create policy "prompt_templates_select" on public.prompt_templates for select using (auth.uid() is not null);
create policy "prompt_templates_write" on public.prompt_templates for all using (public.get_my_role() in ('admin', 'senior'));

create policy "style_vault_select" on public.style_vault for select using (auth.uid() is not null);
create policy "style_vault_write" on public.style_vault for all using (public.get_my_role() in ('admin', 'senior'));

create policy "furniture_references_select" on public.furniture_references for select using (auth.uid() is not null);
create policy "furniture_references_write" on public.furniture_references for all using (public.get_my_role() in ('admin', 'senior'));

-- ─── ACTIVITY LOG ────────────────────────────────────────────
create policy "activity_log_select" on public.activity_log for select using (auth.uid() is not null);
create policy "activity_log_insert" on public.activity_log for insert with check (auth.uid() is not null);

-- ─── TEAM COMMENTS ───────────────────────────────────────────
create policy "team_comments_select" on public.team_comments for select using (auth.uid() is not null);
create policy "team_comments_insert" on public.team_comments for insert with check (auth.uid() is not null);
create policy "team_comments_update_own" on public.team_comments for update using (user_id = auth.uid());

-- ─── API COST LOG ────────────────────────────────────────────
create policy "api_cost_log_select" on public.api_cost_log for select using (public.get_my_role() in ('admin', 'senior'));
create policy "api_cost_log_insert" on public.api_cost_log for insert with check (true);

-- ─── NOTIFICATIONS ───────────────────────────────────────────
create policy "notifications_select_own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_insert" on public.notifications for insert with check (true);
create policy "notifications_update_own" on public.notifications for update using (user_id = auth.uid());

-- ============================================================
-- TRIGGER: AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'junior'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public) values ('shells', 'shells', false);
insert into storage.buckets (id, name, public) values ('renders', 'renders', false);
insert into storage.buckets (id, name, public) values ('style-vault', 'style-vault', false);
insert into storage.buckets (id, name, public) values ('furniture-refs', 'furniture-refs', false);
insert into storage.buckets (id, name, public) values ('exports', 'exports', false);
insert into storage.buckets (id, name, public) values ('client-refs', 'client-refs', false);

-- Storage policies
create policy "team_shells_select" on storage.objects for select using (bucket_id = 'shells' and auth.uid() is not null);
create policy "team_shells_insert" on storage.objects for insert with check (bucket_id = 'shells' and auth.uid() is not null);

create policy "team_renders_select" on storage.objects for select using (bucket_id = 'renders' and auth.uid() is not null);
create policy "team_renders_insert" on storage.objects for insert with check (bucket_id = 'renders' and auth.uid() is not null);

create policy "team_style_vault_select" on storage.objects for select using (bucket_id = 'style-vault' and auth.uid() is not null);
create policy "team_style_vault_insert" on storage.objects for insert with check (bucket_id = 'style-vault' and auth.uid() is not null);

create policy "team_furniture_refs_select" on storage.objects for select using (bucket_id = 'furniture-refs' and auth.uid() is not null);
create policy "team_furniture_refs_insert" on storage.objects for insert with check (bucket_id = 'furniture-refs' and auth.uid() is not null);

create policy "team_exports_select" on storage.objects for select using (bucket_id = 'exports' and auth.uid() is not null);
create policy "team_exports_insert" on storage.objects for insert with check (bucket_id = 'exports' and auth.uid() is not null);

create policy "team_client_refs_select" on storage.objects for select using (bucket_id = 'client-refs' and auth.uid() is not null);
create policy "team_client_refs_insert" on storage.objects for insert with check (bucket_id = 'client-refs' and auth.uid() is not null);
