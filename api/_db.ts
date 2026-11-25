import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null | undefined;

/**
 * Khởi tạo Supabase client ở phía SERVER ONLY (Vercel Functions / Vite Dev Middleware).
 * Không bao giờ import file này vào thư mục src/ của frontend.
 */
export function getServerSupabase(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key || url.includes('your-project-id')) {
    cachedClient = null;
    return null;
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

// Bộ nhớ tạm trên server Node khi chạy local chưa gắn biến môi trường Supabase
export const memoryStore = {
  configs: new Map<string, any>(),
  liveRooms: new Map<string, { game: string; event_type: string; payload: any; updated_at: string }>(),
  matches: [] as Array<any>,
  heroOverrides: new Map<string, { role: string; visible: boolean; image_url?: string | null }>(),
};
