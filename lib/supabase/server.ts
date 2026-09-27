import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client ini dipakai di server component / server action.
// Session diambil dari cookie request, bukan disimpan di kode.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Dipanggil dari Server Component tanpa akses set cookie.
            // Aman diabaikan karena middleware yang menangani refresh session.
          }
        },
      },
    }
  );
}
