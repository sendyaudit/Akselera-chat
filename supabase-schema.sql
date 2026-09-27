-- =========================================================
-- Akselera.Tech - Internal Chat CRM
-- Jalankan seluruh file ini di Supabase Dashboard -> SQL Editor
-- =========================================================

-- 1. TABEL PROFILES
-- Menyimpan data publik tiap akun (nama, email) terpisah dari auth.users
-- supaya bisa ditampilkan di daftar "add new chat" tanpa expose data auth.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Semua user yang sudah login boleh melihat daftar profil lain
-- (dibutuhkan untuk fitur "add new chat" memilih lawan bicara).
-- Hanya kolom id, email, full_name yang ada di tabel ini -> aman untuk dilihat bersama.
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- User hanya boleh update profilnya sendiri.
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- 2. TRIGGER: auto-create row di profiles setiap ada user baru daftar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. TABEL CONVERSATIONS
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

-- User hanya boleh melihat percakapan yang dia ikut serta.
create policy "conversations_select_participant"
  on public.conversations for select
  to authenticated
  using (
    id in (
      select conversation_id from public.conversation_participants
      where user_id = auth.uid()
    )
  );

-- 4. TABEL CONVERSATION_PARTICIPANTS
create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

-- User hanya boleh melihat baris partisipasinya sendiri.
-- (Sengaja TIDAK ada policy INSERT untuk role authenticated di sini.
--  Pembuatan baris hanya boleh lewat function create_direct_conversation
--  di bawah, yang berjalan sebagai security definer. Ini mencegah user
--  memasukkan dirinya ke percakapan orang lain secara langsung.)
create policy "participants_select_own"
  on public.conversation_participants for select
  to authenticated
  using (user_id = auth.uid());

-- 5. TABEL MESSAGES
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- Baca pesan hanya untuk percakapan yang diikuti user.
create policy "messages_select_participant"
  on public.messages for select
  to authenticated
  using (
    conversation_id in (
      select conversation_id from public.conversation_participants
      where user_id = auth.uid()
    )
  );

-- Kirim pesan hanya boleh atas nama diri sendiri, dan hanya ke
-- percakapan yang diikuti user tersebut.
create policy "messages_insert_participant"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and conversation_id in (
      select conversation_id from public.conversation_participants
      where user_id = auth.uid()
    )
  );

-- 6. FUNCTION: buat / ambil percakapan 1-on-1 antara dua user
-- security definer supaya bisa insert ke conversations & conversation_participants
-- untuk KEDUA user sekaligus, tanpa harus membuka akses insert langsung
-- (yang bisa disalahgunakan untuk memasukkan diri ke percakapan orang lain).
create or replace function public.create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  existing_id uuid;
  new_id uuid;
begin
  if other_user_id = auth.uid() then
    raise exception 'Tidak bisa membuat percakapan dengan diri sendiri';
  end if;

  -- cek apakah sudah ada percakapan 1-on-1 antara kedua user ini
  select cp1.conversation_id into existing_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp1.conversation_id = cp2.conversation_id
  where cp1.user_id = auth.uid()
    and cp2.user_id = other_user_id
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations default values returning id into new_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (new_id, auth.uid()), (new_id, other_user_id);

  return new_id;
end;
$$;

-- 7. Aktifkan Realtime untuk tabel messages (untuk fitur bonus realtime)
alter publication supabase_realtime add table public.messages;
