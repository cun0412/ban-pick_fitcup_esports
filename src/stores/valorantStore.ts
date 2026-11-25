import { create } from 'zustand';
import valorantMapsRaw from '../data/valorant-maps.json';
import { DEFAULT_ENABLED_MAPS, VETO_BO1, VETO_BO3, VETO_BO5 } from '../data/defaults';
import { fetchAppConfig, saveAppConfig } from '../lib/api';
import type {
  BoType,
  MapSide,
  SpinConfig,
  SpinResult,
  TeamSide,
  ValorantMap,
  VetoEntry,
  VetoPhase,
} from '../types';

const VAL_STATE_KEY = 'val-state';
const VAL_MAP_POOL_KEY = 'val-map-pool';

export interface SpinAuditItem {
  id: string;
  mapId: string;
  mapName: string;
  mapNumber: number;
  timestamp: number;
  isRespin: boolean;
}

export interface PreSpinBan {
  mapId: string;
  team: TeamSide;
}

/**
 * Chọn số nguyên ngẫu nhiên trong [0, max - 1] bằng crypto.getRandomValues
 */
export function cryptoRandomIndex(max: number): number {
  if (max <= 1) return 0;
  const arr = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / max) * max;
  let val = 0;
  do {
    crypto.getRandomValues(arr);
    val = arr[0];
  } while (val >= limit);
  return val % max;
}

function getDefaultMaps(poolOverrides: Record<string, boolean> = {}): ValorantMap[] {
  const base = valorantMapsRaw as ValorantMap[];
  return base.map((m) => ({
    ...m,
    enabled:
      poolOverrides[m.id] !== undefined
        ? poolOverrides[m.id]
        : poolOverrides[m.name] !== undefined
        ? poolOverrides[m.name]
        : m.enabled !== undefined
        ? m.enabled
        : DEFAULT_ENABLED_MAPS.includes(m.name),
  }));
}

export function getPhasesForBo(bo: BoType): VetoPhase[] {
  if (bo === 'bo1') return VETO_BO1;
  if (bo === 'bo5') return VETO_BO5;
  return VETO_BO3;
}

const DEFAULT_SPIN_CONFIG: SpinConfig = {
  style: 'wheel',
  duration: 5,
  excludePicked: true,
  boType: 'bo3',
  spinPool: 'all',
  customPool: [],
  banBeforeSpin: false,
  bansPerTeam: 1,
  autoSpinAll: false,
  autoSpinDelay: 2,
  allowRespin: false,
};

interface PersistedValState {
  mode: 'veto' | 'spin';
  boType: BoType;
  vetoPhases: VetoPhase[];
  currentVetoIndex: number;
  vetoHistory: VetoEntry[];
  vetoComplete: boolean;
  spinConfig: SpinConfig;
  spinResults: SpinResult[];
  spinHistoryStack: SpinResult[][];
  spinAuditLog: SpinAuditItem[];
  preSpinBans: PreSpinBan[];
}

let valSaveTimer: number | null = null;
function persistVal(s: ValorantStore) {
  const data: PersistedValState = {
    mode: s.mode,
    boType: s.boType,
    vetoPhases: s.vetoPhases,
    currentVetoIndex: s.currentVetoIndex,
    vetoHistory: s.vetoHistory,
    vetoComplete: s.vetoComplete,
    spinConfig: s.spinConfig,
    spinResults: s.spinResults,
    spinHistoryStack: s.spinHistoryStack,
    spinAuditLog: s.spinAuditLog,
    preSpinBans: s.preSpinBans,
  };
  if (valSaveTimer) clearTimeout(valSaveTimer);
  valSaveTimer = window.setTimeout(() => {
    saveAppConfig(VAL_STATE_KEY, data);
  }, 300);
}

export interface ValorantStore extends PersistedValState {
  maps: ValorantMap[];
  isSpinning: boolean;
  currentSpinTargetId: string | null;
  spinTriggerId: number;
  lastWinnerMapId: string | null;

  hydrate: () => Promise<void>;
  loadMaps: (poolOverrides?: Record<string, boolean>) => Promise<void>;
  toggleMap: (id: string) => void;
  setMode: (m: 'veto' | 'spin') => void;
  setBoType: (bo: BoType) => void;
  setCustomVetoPhases: (phases: VetoPhase[]) => void;

  vetoAction: (mapId: string) => void;
  vetoSide: (side: MapSide) => void;
  vetoUndo: () => void;
  vetoReset: () => void;
  swapVetoTeams: () => void;
  getAvailableVetoMaps: () => ValorantMap[];

  setSpinConfig: (cfg: Partial<SpinConfig>) => void;
  toggleCustomPoolMap: (mapId: string) => void;
  addPreSpinBan: (mapId: string, team: TeamSide) => void;
  undoPreSpinBan: () => void;
  clearPreSpinBans: () => void;
  getSpinPoolMaps: () => ValorantMap[];
  prepareSpin: (isRespin?: boolean) => { targetMapId: string; poolMaps: ValorantMap[]; mapNumber: number } | null;
  completeSpin: (mapId: string, mapNumber: number, isRespin?: boolean) => void;
  undoSpin: () => void;
  resetSpin: () => void;
  setSpinResultSide: (mapNumber: number, team: TeamSide, side: MapSide) => void;
}

export const useValorantStore = create<ValorantStore>((set, get) => ({
  mode: 'veto',
  boType: 'bo3',
  vetoPhases: getPhasesForBo('bo3'),
  currentVetoIndex: 0,
  vetoHistory: [],
  vetoComplete: false,
  spinConfig: DEFAULT_SPIN_CONFIG,
  spinResults: [],
  spinHistoryStack: [],
  spinAuditLog: [],
  preSpinBans: [],
  maps: getDefaultMaps(),
  isSpinning: false,
  currentSpinTargetId: null,
  spinTriggerId: 0,
  lastWinnerMapId: null,

  hydrate: async () => {
    const [savedState, savedPool] = await Promise.all([
      fetchAppConfig<Partial<PersistedValState>>(VAL_STATE_KEY),
      fetchAppConfig<Record<string, boolean>>(VAL_MAP_POOL_KEY),
    ]);

    const poolMap = savedPool || {};
    set((s) => {
      const boType = savedState?.boType ?? s.boType;
      return {
        ...s,
        maps: getDefaultMaps(poolMap),
        ...(savedState
          ? {
              mode: savedState.mode ?? s.mode,
              boType,
              vetoPhases: savedState.vetoPhases?.length
                ? savedState.vetoPhases
                : getPhasesForBo(boType),
              currentVetoIndex: savedState.currentVetoIndex ?? 0,
              vetoHistory: savedState.vetoHistory ?? [],
              vetoComplete: savedState.vetoComplete ?? false,
              spinConfig: { ...DEFAULT_SPIN_CONFIG, ...(savedState.spinConfig || {}) },
              spinResults: savedState.spinResults ?? [],
              spinHistoryStack: savedState.spinHistoryStack ?? [],
              spinAuditLog: savedState.spinAuditLog ?? [],
              preSpinBans: savedState.preSpinBans ?? [],
            }
          : {}),
      };
    });

    await get().loadMaps(poolMap);
  },

  loadMaps: async (poolOverrides = {}) => {
    try {
      const res = await fetch('https://valorant-api.com/v1/maps');
      if (!res.ok) return;
      const json = await res.json();
      const rawList = (json.data || []) as Array<any>;
      const filtered = rawList.filter(
        (m) => m.tacticalDescription && String(m.tacticalDescription).trim() !== ''
      );

      const seen = new Set<string>();
      const localJsonMap = new Map<string, ValorantMap>();
      (valorantMapsRaw as ValorantMap[]).forEach((lm) => localJsonMap.set(lm.id, lm));

      const currentEnabled = new Map<string, boolean>();
      get().maps.forEach((m) => currentEnabled.set(m.id, m.enabled));

      const mapped: ValorantMap[] = [];
      for (const m of filtered) {
        if (seen.has(m.displayName)) continue;
        seen.add(m.displayName);
        const localEntry = localJsonMap.get(m.uuid);
        mapped.push({
          id: m.uuid,
          name: m.displayName,
          splash: m.splash || '',
          listViewIcon: m.listViewIconTall || m.listViewIcon || m.splash || '',
          minimap: m.displayIcon || '',
          enabled:
            poolOverrides[m.uuid] !== undefined
              ? poolOverrides[m.uuid]
              : poolOverrides[m.displayName] !== undefined
              ? poolOverrides[m.displayName]
              : currentEnabled.has(m.uuid)
              ? currentEnabled.get(m.uuid)!
              : DEFAULT_ENABLED_MAPS.includes(m.displayName),
          localSplash: localEntry?.localSplash || `/maps/${m.uuid}-splash.png`,
          localIcon: localEntry?.localIcon || `/maps/${m.uuid}-icon.png`,
        });
      }

      if (mapped.length > 0) {
        set({ maps: mapped });
      }
    } catch {}
  },

  toggleMap: (id) =>
    set((s) => {
      const nextMaps = s.maps.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      );
      const poolObj: Record<string, boolean> = {};
      nextMaps.forEach((m) => {
        poolObj[m.id] = m.enabled;
      });
      saveAppConfig(VAL_MAP_POOL_KEY, poolObj);
      return { maps: nextMaps };
    }),

  setMode: (mode) =>
    set((s) => {
      const next = { ...s, mode };
      persistVal(next);
      return next;
    }),

  setBoType: (boType) =>
    set((s) => {
      const vetoPhases = getPhasesForBo(boType);
      const next = {
        ...s,
        boType,
        vetoPhases,
        currentVetoIndex: 0,
        vetoHistory: [],
        vetoComplete: false,
        spinConfig: { ...s.spinConfig, boType },
      };
      persistVal(next);
      return next;
    }),

  setCustomVetoPhases: (vetoPhases) =>
    set((s) => {
      const next = {
        ...s,
        vetoPhases,
        currentVetoIndex: 0,
        vetoHistory: [],
        vetoComplete: false,
      };
      persistVal(next);
      return next;
    }),

  getAvailableVetoMaps: () => {
    const { maps, vetoHistory } = get();
    const usedIds = new Set(vetoHistory.map((v) => v.mapId));
    return maps.filter((m) => m.enabled && !usedIds.has(m.id));
  },

  vetoAction: (mapId) =>
    set((s) => {
      if (s.vetoComplete || s.currentVetoIndex >= s.vetoPhases.length) return s;
      const phase = s.vetoPhases[s.currentVetoIndex];
      if (phase.action !== 'ban' && phase.action !== 'pick') return s;

      const pickCount = s.vetoHistory.filter(
        (v) => v.action === 'pick' || v.action === 'decider'
      ).length;

      const newEntry: VetoEntry = {
        mapId,
        action: phase.action,
        team: phase.team,
        side: null,
        sideTeam: null,
        mapNumber: phase.action === 'pick' ? pickCount + 1 : undefined,
      };

      const nextHistory = [...s.vetoHistory, newEntry];
      const nextIndex = s.currentVetoIndex + 1;
      const nextComplete = nextIndex >= s.vetoPhases.length;

      const nextPhase = s.vetoPhases[nextIndex];
      if (nextPhase && nextPhase.action === 'decider') {
        const used = new Set(nextHistory.map((v) => v.mapId));
        const remaining = s.maps.filter((m) => m.enabled && !used.has(m.id));
        if (remaining.length === 1) {
          const deciderMap = remaining[0];
          const totalPicks = nextHistory.filter((v) => v.action === 'pick').length;
          nextHistory.push({
            mapId: deciderMap.id,
            action: 'decider',
            team: nextPhase.team,
            side: null,
            sideTeam: nextPhase.team,
            mapNumber: totalPicks + 1,
          });
        }
      }

      const next = {
        ...s,
        vetoHistory: nextHistory,
        currentVetoIndex: nextIndex,
        vetoComplete: nextComplete,
      };
      persistVal(next);
      return next;
    }),

  vetoSide: (side) =>
    set((s) => {
      if (s.vetoComplete || s.currentVetoIndex >= s.vetoPhases.length) return s;
      const phase = s.vetoPhases[s.currentVetoIndex];
      if (phase.action !== 'side' && phase.action !== 'decider') return s;

      const nextHistory = s.vetoHistory.map((v) => ({ ...v }));
      for (let i = nextHistory.length - 1; i >= 0; i--) {
        if (nextHistory[i].action === 'pick' || nextHistory[i].action === 'decider') {
          nextHistory[i].side = side;
          nextHistory[i].sideTeam = phase.team;
          break;
        }
      }

      const nextIndex = s.currentVetoIndex + 1;
      const nextComplete = nextIndex >= s.vetoPhases.length;

      const nextPhase = s.vetoPhases[nextIndex];
      if (nextPhase && nextPhase.action === 'decider') {
        const used = new Set(nextHistory.map((v) => v.mapId));
        const remaining = s.maps.filter((m) => m.enabled && !used.has(m.id));
        if (remaining.length === 1) {
          const totalPicks = nextHistory.filter((v) => v.action === 'pick').length;
          nextHistory.push({
            mapId: remaining[0].id,
            action: 'decider',
            team: nextPhase.team,
            side: null,
            sideTeam: nextPhase.team,
            mapNumber: totalPicks + 1,
          });
        }
      }

      const next = {
        ...s,
        vetoHistory: nextHistory,
        currentVetoIndex: nextIndex,
        vetoComplete: nextComplete,
      };
      persistVal(next);
      return next;
    }),

  vetoUndo: () =>
    set((s) => {
      if (s.currentVetoIndex === 0 && s.vetoHistory.length === 0) return s;
      const prevIdx = Math.max(0, s.currentVetoIndex - 1);
      const prevPhase = s.vetoPhases[prevIdx];
      const nextHistory = [...s.vetoHistory];

      if (
        nextHistory.length > 0 &&
        nextHistory[nextHistory.length - 1].action === 'decider'
      ) {
        if (prevPhase.action === 'decider') {
          nextHistory[nextHistory.length - 1] = {
            ...nextHistory[nextHistory.length - 1],
            side: null,
          };
          const next = {
            ...s,
            vetoHistory: nextHistory,
            currentVetoIndex: prevIdx,
            vetoComplete: false,
          };
          persistVal(next);
          return next;
        }
        nextHistory.pop();
      }

      if (prevPhase?.action === 'side') {
        for (let i = nextHistory.length - 1; i >= 0; i--) {
          if (nextHistory[i].action === 'pick') {
            nextHistory[i] = { ...nextHistory[i], side: null, sideTeam: null };
            break;
          }
        }
      } else if (nextHistory.length > 0) {
        nextHistory.pop();
      }

      const next = {
        ...s,
        vetoHistory: nextHistory,
        currentVetoIndex: prevIdx,
        vetoComplete: false,
      };
      persistVal(next);
      return next;
    }),

  vetoReset: () =>
    set((s) => {
      const next = {
        ...s,
        currentVetoIndex: 0,
        vetoHistory: [],
        vetoComplete: false,
      };
      persistVal(next);
      return next;
    }),

  swapVetoTeams: () =>
    set((s) => {
      const flip = (t: TeamSide): TeamSide => (t === 'A' ? 'B' : 'A');
      const next = {
        ...s,
        vetoPhases: s.vetoPhases.map((p) => ({ ...p, team: flip(p.team) })),
        vetoHistory: s.vetoHistory.map((h) => ({
          ...h,
          team: flip(h.team),
          sideTeam: h.sideTeam ? flip(h.sideTeam) : null,
        })),
      };
      persistVal(next);
      return next;
    }),

  setSpinConfig: (cfg) =>
    set((s) => {
      const next = { ...s, spinConfig: { ...s.spinConfig, ...cfg } };
      persistVal(next);
      return next;
    }),

  toggleCustomPoolMap: (mapId) =>
    set((s) => {
      const cur = s.spinConfig.customPool;
      const nextPool = cur.includes(mapId)
        ? cur.filter((id) => id !== mapId)
        : [...cur, mapId];
      const next = {
        ...s,
        spinConfig: { ...s.spinConfig, customPool: nextPool },
      };
      persistVal(next);
      return next;
    }),

  addPreSpinBan: (mapId, team) =>
    set((s) => {
      if (s.preSpinBans.some((b) => b.mapId === mapId)) return s;
      const next = {
        ...s,
        preSpinBans: [...s.preSpinBans, { mapId, team }],
      };
      persistVal(next);
      return next;
    }),

  undoPreSpinBan: () =>
    set((s) => {
      const next = { ...s, preSpinBans: s.preSpinBans.slice(0, -1) };
      persistVal(next);
      return next;
    }),

  clearPreSpinBans: () =>
    set((s) => {
      const next = { ...s, preSpinBans: [] };
      persistVal(next);
      return next;
    }),

  getSpinPoolMaps: () => {
    const { maps, spinConfig, vetoHistory, spinResults, preSpinBans } = get();
    const enabledMaps = maps.filter((m) => m.enabled);

    let basePool = enabledMaps;
    if (spinConfig.spinPool === 'custom' && spinConfig.customPool.length > 0) {
      const customSet = new Set(spinConfig.customPool);
      basePool = maps.filter((m) => customSet.has(m.id));
    } else if (spinConfig.spinPool === 'remaining') {
      const bannedVetoIds = new Set(
        vetoHistory.filter((v) => v.action === 'ban').map((v) => v.mapId)
      );
      basePool = enabledMaps.filter((m) => !bannedVetoIds.has(m.id));
    }

    if (spinConfig.banBeforeSpin && preSpinBans.length > 0) {
      const preBanned = new Set(preSpinBans.map((b) => b.mapId));
      basePool = basePool.filter((m) => !preBanned.has(m.id));
    }

    if (spinConfig.excludePicked && spinResults.length > 0) {
      const picked = new Set(spinResults.map((r) => r.mapId));
      const filtered = basePool.filter((m) => !picked.has(m.id));
      if (filtered.length > 0) basePool = filtered;
    }

    return basePool;
  },

  prepareSpin: (isRespin = false) => {
    const state = get();
    if (state.isSpinning) return null;

    let poolMaps = state.getSpinPoolMaps();
    if (isRespin && state.spinResults.length > 0 && state.spinConfig.excludePicked) {
      const previousIds = new Set(state.spinResults.slice(0, -1).map((r) => r.mapId));
      const basePool = state.maps.filter((m) => m.enabled && !previousIds.has(m.id));
      if (basePool.length > 0) poolMaps = basePool;
    }

    if (poolMaps.length === 0) return null;

    const idx = cryptoRandomIndex(poolMaps.length);
    const targetMap = poolMaps[idx];
    const mapNumber = isRespin
      ? state.spinResults.length
      : state.spinResults.length + 1;

    set((s) => ({
      isSpinning: true,
      currentSpinTargetId: targetMap.id,
      spinTriggerId: s.spinTriggerId + 1,
      lastWinnerMapId: null,
    }));

    return { targetMapId: targetMap.id, poolMaps, mapNumber };
  },

  completeSpin: (mapId, mapNumber, isRespin = false) =>
    set((s) => {
      const mapObj = s.maps.find((m) => m.id === mapId);
      const newResult: SpinResult = {
        mapId,
        mapNumber,
        timestamp: Date.now(),
      };
      const nextStack = [...s.spinHistoryStack, s.spinResults];
      const nextResults = isRespin
        ? [...s.spinResults.slice(0, -1), newResult]
        : [...s.spinResults, newResult];

      const auditEntry: SpinAuditItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        mapId,
        mapName: mapObj?.name || mapId,
        mapNumber,
        timestamp: Date.now(),
        isRespin,
      };

      const next = {
        ...s,
        isSpinning: false,
        lastWinnerMapId: mapId,
        spinResults: nextResults,
        spinHistoryStack: nextStack,
        spinAuditLog: [auditEntry, ...s.spinAuditLog],
      };
      persistVal(next);
      return next;
    }),

  undoSpin: () =>
    set((s) => {
      if (s.spinResults.length === 0) return s;
      const prevResults =
        s.spinHistoryStack.length > 0
          ? s.spinHistoryStack[s.spinHistoryStack.length - 1]
          : s.spinResults.slice(0, -1);
      const next = {
        ...s,
        spinResults: prevResults,
        spinHistoryStack: s.spinHistoryStack.slice(0, -1),
        lastWinnerMapId: null,
      };
      persistVal(next);
      return next;
    }),

  resetSpin: () =>
    set((s) => {
      const next = {
        ...s,
        spinResults: [],
        spinHistoryStack: [],
        spinAuditLog: [],
        preSpinBans: [],
        isSpinning: false,
        currentSpinTargetId: null,
        lastWinnerMapId: null,
      };
      persistVal(next);
      return next;
    }),

  setSpinResultSide: (mapNumber, team, side) =>
    set((s) => {
      const nextResults = s.spinResults.map((r) =>
        r.mapNumber === mapNumber ? { ...r, side: { team, side } } : r
      );
      const next = { ...s, spinResults: nextResults };
      persistVal(next);
      return next;
    }),
}));
