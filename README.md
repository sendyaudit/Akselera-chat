# Akselera.Tech — Internal Chat CRM

Fondasi fitur chat untuk CRM internal Akselera.Tech (integrasi WhatsApp menyusul, di luar scope task ini).

## Stack & Infrastruktur

- **Next.js 16 (App Router, TypeScript)** — framework wajib sesuai brief.
- **Supabase** (Postgres + Auth + Realtime) — dipilih karena satu layanan ini sudah mencakup:
  - Database relasional (Postgres) dengan **Row Level Security (RLS)** bawaan, sehingga aturan "satu akun hanya bisa membaca percakapannya sendiri" bisa ditegakkan **di level database**, bukan hanya disembunyikan di UI — ini langsung menjawab fitur wajib nomor 5 dengan cara yang paling aman.
  - Auth (email/password) siap pakai, termasuk manajemen sesi lewat cookie di Next.js melalui `@supabase/ssr`.
  - Realtime subscription untuk fitur bonus "pesan masuk tanpa refresh".
  - Free tier yang cukup untuk kebutuhan aplikasi kecil seperti ini (tidak perlu kartu kredit, cukup untuk demo/review).
- **Tailwind CSS v4** — styling cepat, konsisten dengan brand warna hitam/putih.
- **next-themes** — dark/light mode dengan preferensi tersimpan di localStorage (bonus).
- **Vercel** — hosting, terintegrasi mulus dengan Next.js dan gratis untuk kebutuhan ini.

## Cara Menjalankan Secara Lokal

1. Clone repo ini, lalu install dependency:
   ```
   npm install
   ```
2. Buat project di [supabase.com](https://supabase.com), lalu jalankan seluruh isi file `supabase-schema.sql` di **SQL Editor** Supabase (bisa dijalankan sekaligus atau dipecah per bagian jika editor membatasi panjang query).
3. Salin `.env.local.example` menjadi `.env.local`, isi dengan kredensial dari **Project Settings → API** di dashboard Supabase:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Jalankan:
   ```
   npm run dev
   ```
5. Buka `http://localhost:3000` — akan diarahkan ke halaman login.

## Struktur Tabel

| Tabel | Keterangan |
|---|---|
| `profiles` | Data publik tiap akun (id, email, nama). Terisi otomatis lewat trigger saat user mendaftar. |
| `conversations` | Daftar percakapan (hanya menyimpan id & waktu dibuat). |
| `conversation_participants` | Menghubungkan user ke percakapan (2 baris per percakapan 1-on-1). |
| `messages` | Isi pesan, terhubung ke `conversation_id` dan `sender_id`. |

Fungsi `create_direct_conversation(other_user_id)` (security definer) adalah satu-satunya jalur resmi untuk membuat percakapan baru — mencegah user membuat baris `conversation_participants` untuk percakapan orang lain secara langsung.

## Keamanan Akses Data

Seluruh tabel mengaktifkan RLS:
- `messages` dan `conversations` hanya bisa dibaca oleh user yang tercatat sebagai partisipan di `conversation_participants`.
- Insert pesan hanya diizinkan atas nama diri sendiri (`sender_id = auth.uid()`) ke percakapan yang diikuti.
- `conversation_participants` tidak punya policy insert untuk role `authenticated` — pembuatan baris hanya lewat function `create_direct_conversation`.

Ini berlaku juga jika data diakses langsung lewat REST API Supabase atau client library, bukan cuma disembunyikan di tampilan.

## AI Tools yang Dipakai

- Claude (Anthropic) — membantu menyusun skema database, RLS policy, dan seluruh kode aplikasi (komponen React, auth flow, realtime subscription), serta membimbing proses setup Supabase dan debugging error SQL secara bertahap.

## Yang Belum Selesai / Bisa Dikembangkan Lebih Lanjut

- Logo masih placeholder teks (`/public/logo-black.svg`, `/public/logo-white.svg`) — perlu diganti dengan file asli dari folder "File Asset".
- Penanda pesan belum dibaca (unread indicator) belum diimplementasikan.
- Status online belum diimplementasikan (bisa memakai Supabase Presence).
- Konfirmasi email saat registrasi mandiri saat ini mengikuti pengaturan default Supabase Auth (bisa dinonaktifkan di dashboard untuk mempercepat testing).
