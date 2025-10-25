import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServerClient() {
  const cookieStore = await cookies(); // ✅ now correctly awaited

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // ignore if not writable (non-request context)
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // ignore if not writable
          }
        },
      },
    }
  );
}
