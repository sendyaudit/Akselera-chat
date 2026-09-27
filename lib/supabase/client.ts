import { createBrowserClient } from "@supabase/ssr";

// Client ini dipakai di komponen sisi browser ("use client").
// Hanya memakai anon/publishable key -> aman ditaruh di kode frontend,
// karena semua akses data tetap dibatasi oleh RLS policy di database.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
