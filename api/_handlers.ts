import crypto from 'node:crypto';
import { getServerSupabase, memoryStore } from './_db.js';

export interface ApiRequest {
  method: string;
  query: Record<string, string>;
  body: any;
}

export interface ApiResponse {
  status: number;
  data: any;
}

export async function handleHealth(): Promise<ApiResponse> {
  const db = getServerSupabase();
  return {
    status: 200,
    data: {
      ok: true,
      storage: db ? 'postgres' : 'memory',
    },
  };
}

export async function handleConfig(req: ApiRequest): Promise<ApiResponse> {
  const db = getServerSupabase();
  const key = req.query.key;

  if (req.method === 'GET') {
    if (!key) return { status: 400, data: { error: 'Thiếu key' } };
    if (db) {
      const { data, error } = await db
        .from('app_configs')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) return { status: 500, data: { error: error.message } };
      return { status: 200, data: { value: data?.value ?? null } };
    }
    return { status: 200, data: { value: memoryStore.configs.get(key) ?? null } };
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const bodyKey = key || req.body?.key;
    const value = req.body?.value;
    if (!bodyKey || value === undefined) {
      return { status: 400, data: { error: 'Thiếu key hoặc value' } };
    }
    if (db) {
      const { error } = await db.from('app_configs').upsert(
        {
          key: bodyKey,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
      if (error) return { status: 500, data: { error: error.message } };
      return { status: 200, data: { ok: true } };
    }
    memoryStore.configs.set(bodyKey, value);
    return { status: 200, data: { ok: true } };
  }

  return { status: 405, data: { error: 'Method not allowed' } };
}

export async function handleLive(req: ApiRequest): Promise<ApiResponse> {
  const db = getServerSupabase();
  const room = req.query.room || req.body?.room;

  if (req.method === 'GET') {
    if (!room) return { status: 400, data: { error: 'Thiếu room' } };
    if (db) {
      const { data, error } = await db
        .from('live_rooms')
        .select('event_type, payload, updated_at')
        .eq('room_id', room)
        .maybeSingle();
      if (error) return { status: 500, data: { error: error.message } };
      return { status: 200, data: data || null };
    }
    return { status: 200, data: memoryStore.liveRooms.get(room) || null };
  }

  if (req.method === 'POST') {
    const { game, event_type, payload } = req.body || {};
    if (!room || !event_type || payload === undefined) {
      return { status: 400, data: { error: 'Thiếu dữ liệu live room' } };
    }
    const now = new Date().toISOString();
    if (db) {
      const { error } = await db.from('live_rooms').upsert(
        {
          room_id: room,
          game: game || (room.startsWith('lq') ? 'lq' : 'valorant'),
          event_type,
          payload,
          updated_at: now,
        },
        { onConflict: 'room_id' }
      );
      if (error) return { status: 500, data: { error: error.message } };
      return { status: 200, data: { ok: true, updated_at: now } };
    }
    memoryStore.liveRooms.set(room, {
      game: game || (room.startsWith('lq') ? 'lq' : 'valorant'),
      event_type,
      payload,
      updated_at: now,
    });
    return { status: 200, data: { ok: true, updated_at: now } };
  }

  return { status: 405, data: { error: 'Method not allowed' } };
}

export async function handleMatches(req: ApiRequest): Promise<ApiResponse> {
  const db = getServerSupabase();

  if (req.method === 'GET') {
    if (db) {
      const { data, error } = await db
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return { status: 500, data: { error: error.message } };
      return { status: 200, data: { matches: data || [], storage: 'postgres' } };
    }
    return { status: 200, data: { matches: memoryStore.matches, storage: 'memory' } };
  }

  if (req.method === 'POST') {
    const entry = req.body;
    if (!entry || !entry.game || !entry.result) {
      return { status: 400, data: { error: 'Dữ liệu trận đấu không hợp lệ' } };
    }
    if (db) {
      const { data, error } = await db
        .from('matches')
        .insert({
          game: entry.game,
          tournament_name: entry.tournament_name || 'FITCUP',
          round_name: entry.round_name || '',
          mode: entry.mode || 'banpick',
          team_a: entry.team_a || {},
          team_b: entry.team_b || {},
          result: entry.result,
        })
        .select()
        .single();
      if (error) return { status: 500, data: { error: error.message } };
      return { status: 201, data: { match: data, storage: 'postgres' } };
    }
    const created = {
      ...entry,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    memoryStore.matches.unshift(created);
    return { status: 201, data: { match: created, storage: 'memory' } };
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return { status: 400, data: { error: 'Thiếu id' } };
    if (db) {
      const { error } = await db.from('matches').delete().eq('id', id);
      if (error) return { status: 500, data: { error: error.message } };
      return { status: 200, data: { ok: true } };
    }
    const idx = memoryStore.matches.findIndex((m) => m.id === id);
    if (idx !== -1) memoryStore.matches.splice(idx, 1);
    return { status: 200, data: { ok: true } };
  }

  return { status: 405, data: { error: 'Method not allowed' } };
}

export async function handleHeroes(req: ApiRequest): Promise<ApiResponse> {
  const db = getServerSupabase();

  if (req.method === 'GET') {
    if (db) {
      const { data, error } = await db
        .from('hero_overrides')
        .select('hero_id, role, visible, image_url');
      if (error) return { status: 500, data: { error: error.message } };
      const overrides: Record<string, { role?: string; visible?: boolean; image?: string }> = {};
      for (const row of data || []) {
        overrides[row.hero_id] = {
          role: row.role,
          visible: row.visible,
          ...(row.image_url ? { image: row.image_url } : {}),
        };
      }
      return { status: 200, data: { overrides } };
    }
    const overrides: Record<string, any> = {};
    memoryStore.heroOverrides.forEach((v, k) => {
      overrides[k] = {
        role: v.role,
        visible: v.visible,
        ...(v.image_url ? { image: v.image_url } : {}),
      };
    });
    return { status: 200, data: { overrides } };
  }

  if (req.method === 'POST') {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) {
      return { status: 400, data: { error: 'Danh sách trống' } };
    }
    const now = new Date().toISOString();
    if (db) {
      const rows = items.map((it: any) => ({
        hero_id: it.hero_id,
        role: it.role ?? '',
        visible: it.visible ?? true,
        ...(it.image !== undefined ? { image_url: it.image } : {}),
        updated_at: now,
      }));
      const { error } = await db
        .from('hero_overrides')
        .upsert(rows, { onConflict: 'hero_id' });
      if (error) return { status: 500, data: { error: error.message } };
      return { status: 200, data: { ok: true } };
    }
    for (const it of items) {
      const prev = memoryStore.heroOverrides.get(it.hero_id);
      memoryStore.heroOverrides.set(it.hero_id, {
        role: it.role ?? prev?.role ?? '',
        visible: it.visible ?? prev?.visible ?? true,
        image_url: it.image !== undefined ? it.image : prev?.image_url,
      });
    }
    return { status: 200, data: { ok: true } };
  }

  return { status: 405, data: { error: 'Method not allowed' } };
}
