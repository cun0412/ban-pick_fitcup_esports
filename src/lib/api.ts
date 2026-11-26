import type { HeroRole, TeamConfig } from '../types';

export interface SavedMatchRecord {
  id: string;
  game: 'lq' | 'valorant';
  tournament_name: string;
  round_name: string;
  mode: string;
  team_a: TeamConfig;
  team_b: TeamConfig;
  result: any;
  created_at: string;
}

export interface HeroOverridePayload {
  hero_id: string;
  role: HeroRole;
  visible: boolean;
  image?: string;
}

export async function getBackendHealth(): Promise<{
  ok: boolean;
  storage: 'postgres' | 'memory';
}> {
  try {
    const res = await fetch('/api/health');
    if (res.ok) return await res.json();
  } catch {}
  return { ok: false, storage: 'memory' };
}

export async function fetchAppConfig<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/config?key=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return (json.value as T) ?? null;
  } catch {
    return null;
  }
}

export async function saveAppConfig(key: string, value: any): Promise<boolean> {
  try {
    const res = await fetch(`/api/config?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchLiveRoom(
  room: string,
  since?: string
): Promise<{
  event_type?: string;
  payload?: any;
  updated_at?: string;
  unchanged?: boolean;
} | null> {
  try {
    const query = since
      ? `room=${encodeURIComponent(room)}&since=${encodeURIComponent(since)}`
      : `room=${encodeURIComponent(room)}`;
    const res = await fetch(`/api/live?${query}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function pushLiveRoom(
  room: string,
  game: 'lq' | 'valorant',
  eventType: string,
  payload: any
): Promise<boolean> {
  try {
    const res = await fetch(`/api/live?room=${encodeURIComponent(room)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, game, event_type: eventType, payload }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchMatchRecords(): Promise<{
  data: SavedMatchRecord[];
  storage: 'postgres' | 'memory';
}> {
  try {
    const res = await fetch('/api/matches');
    if (res.ok) {
      const json = await res.json();
      return {
        data: (json.matches || []) as SavedMatchRecord[],
        storage: json.storage === 'postgres' ? 'postgres' : 'memory',
      };
    }
  } catch {}
  return { data: [], storage: 'memory' };
}

export async function saveMatchRecord(
  entry: Omit<SavedMatchRecord, 'id' | 'created_at'>
): Promise<{ ok: boolean; storage: 'postgres' | 'memory' }> {
  try {
    const res = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (res.ok) {
      const json = await res.json();
      return {
        ok: true,
        storage: json.storage === 'postgres' ? 'postgres' : 'memory',
      };
    }
  } catch {}
  return { ok: false, storage: 'memory' };
}

export async function deleteMatchRecord(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/matches?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchHeroOverrides(): Promise<
  Record<string, { role?: HeroRole; visible?: boolean; image?: string }>
> {
  try {
    const res = await fetch('/api/heroes');
    if (res.ok) {
      const json = await res.json();
      return json.overrides || {};
    }
  } catch {}
  return {};
}

export async function saveHeroOverrides(
  items: HeroOverridePayload[]
): Promise<boolean> {
  if (items.length === 0) return true;
  try {
    const res = await fetch('/api/heroes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchFootballReports<T = any>(): Promise<{
  data: T[];
  storage: 'postgres' | 'memory';
}> {
  try {
    const res = await fetch('/api/football-reports', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      return {
        data: (json.reports || []) as T[],
        storage: json.storage === 'postgres' ? 'postgres' : 'memory',
      };
    }
  } catch {}
  return { data: [], storage: 'memory' };
}

export async function saveFootballReport<T extends { id?: string }>(
  report: T
): Promise<{ ok: boolean; report?: T; storage: 'postgres' | 'memory' }> {
  try {
    const res = await fetch('/api/football-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: report.id, report }),
    });
    if (res.ok) {
      const json = await res.json();
      return {
        ok: true,
        report: json.report as T,
        storage: json.storage === 'postgres' ? 'postgres' : 'memory',
      };
    }
  } catch {}
  return { ok: false, storage: 'memory' };
}

export async function deleteFootballReport(id: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/football-reports?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
    return res.ok;
  } catch {
    return false;
  }
}
