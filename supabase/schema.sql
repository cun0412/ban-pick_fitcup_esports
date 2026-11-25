-- =====================================================================
-- SCHEMA DATABASE SUPABASE CHO HỆ THỐNG BAN/PICK FITCUP
-- Copy toàn bộ nội dung này vào Supabase -> SQL Editor -> Run
-- =====================================================================

-- 1. Bảng lưu trạng thái trực tiếp để đồng bộ giữa Control và Màn hình chiếu
CREATE TABLE IF NOT EXISTS public.live_rooms (
  room_id TEXT PRIMARY KEY,
  game TEXT NOT NULL CHECK (game IN ('lq', 'valorant')),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bảng lưu cấu hình giải đấu, trạng thái Ban/Pick và Map Pool
CREATE TABLE IF NOT EXISTS public.app_configs (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bảng lưu lịch sử các trận đấu Ban/Pick & Quay Map giải FITCUP
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL CHECK (game IN ('lq', 'valorant')),
  tournament_name TEXT NOT NULL DEFAULT 'FITCUP',
  round_name TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'banpick',
  team_a JSONB NOT NULL,
  team_b JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_game ON public.matches (game);

-- 4. Bảng lưu tùy chỉnh vai trò, ẩn/hiện và ảnh tướng Liên Quân
CREATE TABLE IF NOT EXISTS public.hero_overrides (
  hero_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT '',
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  image_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trường hợp bảng hero_overrides đã tạo từ bản trước thì bổ sung cột image_url
ALTER TABLE public.hero_overrides ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 5. Bật Row Level Security (mọi truy cập đi qua Backend API bằng Service Role / Server Key)
ALTER TABLE public.live_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_overrides ENABLE ROW LEVEL SECURITY;
