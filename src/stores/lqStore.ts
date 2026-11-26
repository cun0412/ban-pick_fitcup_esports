import { create } from 'zustand';
import lqHeroesRaw from '../data/lq-heroes.json';
import { LQ_DEFAULT_PHASES } from '../data/defaults';
import {
  fetchAppConfig,
  fetchHeroOverrides,
  saveAppConfig,
} from '../lib/api';
import type {
  BPAction,
  BPPhase,
  BPSlot,
  HeroRole,
  LQHero,
  LQHistoryEntry,
  TeamSide,
} from '../types';

const CONFIG_KEY = 'lq-state-v2';

export interface HeroOverride {
  role?: HeroRole;
  visible?: boolean;
  image?: string;
}

export function buildMergedHeroes(
  overrides: Record<string, HeroOverride> = {}
): LQHero[] {
  const base = lqHeroesRaw as LQHero[];
  return base.map((h) => {
    const ov = overrides[h.id];
    return {
      ...h,
      role: ov?.role !== undefined ? ov.role : (h.role as HeroRole) || '',
      visible: ov?.visible !== undefined ? ov.visible : h.visible !== false,
      image: ov?.image || h.image,
    };
  });
}

function createEmptySlots(phases: BPPhase[], action: BPAction, team: TeamSide): BPSlot[] {
  const count = phases.filter((p) => p.action === action && p.team === team).length;
  return Array.from({ length: count }, () => ({ heroId: null, playerName: '' }));
}

interface PersistedLQState {
  phases: BPPhase[];
  currentPhaseIndex: number;
  bansA: BPSlot[];
  bansB: BPSlot[];
  picksA: BPSlot[];
  picksB: BPSlot[];
  scoreA: number;
  scoreB: number;
  boLabel: string;
  timerMax: number;
  timerAutoSkip: boolean;
  isComplete: boolean;
  history: LQHistoryEntry[];
}

let saveTimer: number | null = null;
function persistState(s: PersistedLQState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveAppConfig(CONFIG_KEY, s);
  }, 300);
}

function extractPersisted(s: LQStore): PersistedLQState {
  return {
    phases: s.phases,
    currentPhaseIndex: s.currentPhaseIndex,
    bansA: s.bansA,
    bansB: s.bansB,
    picksA: s.picksA,
    picksB: s.picksB,
    scoreA: s.scoreA,
    scoreB: s.scoreB,
    boLabel: s.boLabel,
    timerMax: s.timerMax,
    timerAutoSkip: s.timerAutoSkip,
    isComplete: s.isComplete,
    history: s.history,
  };
}

export interface LQStore extends PersistedLQState {
  heroes: LQHero[];
  heroesVersion: number;
  selectedHeroId: string | null;

  hydrate: () => Promise<void>;
  refreshHeroes: () => Promise<void>;
  selectHero: (id: string | null) => void;
  confirmPick: () => { action: BPAction; team: TeamSide } | null;
  skipPhase: () => void;
  undo: () => void;
  reset: () => void;
  setPhases: (phases: BPPhase[]) => void;
  setTimerMax: (seconds: number) => void;
  setTimerAutoSkip: (v: boolean) => void;
  setScoreA: (score: number) => void;
  setScoreB: (score: number) => void;
  setBoLabel: (bo: string) => void;
  setPlayerName: (team: TeamSide, index: number, name: string) => void;
  swapSidesSlots: () => void;
  getCurrentPhase: () => BPPhase | null;
  getCurrentSlotIndex: () => number;
  getUsedHeroIds: () => Set<string>;
}

export const useLQStore = create<LQStore>((set, get) => ({
  phases: LQ_DEFAULT_PHASES,
  currentPhaseIndex: 0,
  bansA: createEmptySlots(LQ_DEFAULT_PHASES, 'ban', 'A'),
  bansB: createEmptySlots(LQ_DEFAULT_PHASES, 'ban', 'B'),
  picksA: createEmptySlots(LQ_DEFAULT_PHASES, 'pick', 'A'),
  picksB: createEmptySlots(LQ_DEFAULT_PHASES, 'pick', 'B'),
  scoreA: 0,
  scoreB: 0,
  boLabel: 'BO1',
  timerMax: 30,
  timerAutoSkip: false,
  isComplete: false,
  history: [],
  heroes: buildMergedHeroes(),
  heroesVersion: 0,
  selectedHeroId: null,

  hydrate: async () => {
    const [saved, overrides] = await Promise.all([
      fetchAppConfig<Partial<PersistedLQState>>(CONFIG_KEY),
      fetchHeroOverrides(),
    ]);

    set((prev) => {
      const phases = saved?.phases?.length ? saved.phases : prev.phases;
      return {
        ...prev,
        heroes: buildMergedHeroes(overrides),
        heroesVersion: Date.now(),
        ...(saved
          ? {
              phases,
              currentPhaseIndex: saved.currentPhaseIndex ?? 0,
              bansA: saved.bansA ?? createEmptySlots(phases, 'ban', 'A'),
              bansB: saved.bansB ?? createEmptySlots(phases, 'ban', 'B'),
              picksA: saved.picksA ?? createEmptySlots(phases, 'pick', 'A'),
              picksB: saved.picksB ?? createEmptySlots(phases, 'pick', 'B'),
              scoreA: saved.scoreA ?? 0,
              scoreB: saved.scoreB ?? 0,
              boLabel: saved.boLabel ?? 'BO1',
              timerMax: saved.timerMax ?? 30,
              timerAutoSkip: saved.timerAutoSkip ?? false,
              isComplete: saved.isComplete ?? false,
              history: saved.history ?? [],
            }
          : {}),
      };
    });
  },

  refreshHeroes: async () => {
    const overrides = await fetchHeroOverrides();
    set({ heroes: buildMergedHeroes(overrides), heroesVersion: Date.now() });
  },

  selectHero: (id) => set({ selectedHeroId: id }),

  getCurrentPhase: () => {
    const { phases, currentPhaseIndex, isComplete } = get();
    if (isComplete || currentPhaseIndex >= phases.length) return null;
    return phases[currentPhaseIndex];
  },

  getCurrentSlotIndex: () => {
    const { phases, currentPhaseIndex } = get();
    if (currentPhaseIndex >= phases.length) return -1;
    const curr = phases[currentPhaseIndex];
    let idx = 0;
    for (let i = 0; i < currentPhaseIndex; i++) {
      if (phases[i].action === curr.action && phases[i].team === curr.team) {
        idx++;
      }
    }
    return idx;
  },

  getUsedHeroIds: () => {
    const { bansA, bansB, picksA, picksB } = get();
    const setIds = new Set<string>();
    [...bansA, ...bansB, ...picksA, ...picksB].forEach((slot) => {
      if (slot.heroId) setIds.add(slot.heroId);
    });
    return setIds;
  },

  confirmPick: () => {
    const state = get();
    const phase = state.getCurrentPhase();
    if (!phase || !state.selectedHeroId) return null;
    if (state.getUsedHeroIds().has(state.selectedHeroId)) return null;

    const slotIdx = state.getCurrentSlotIndex();
    const heroId = state.selectedHeroId;

    const nextBansA = state.bansA.map((s) => ({ ...s }));
    const nextBansB = state.bansB.map((s) => ({ ...s }));
    const nextPicksA = state.picksA.map((s) => ({ ...s }));
    const nextPicksB = state.picksB.map((s) => ({ ...s }));

    const targetList =
      phase.action === 'ban'
        ? phase.team === 'A'
          ? nextBansA
          : nextBansB
        : phase.team === 'A'
        ? nextPicksA
        : nextPicksB;

    if (slotIdx >= 0 && slotIdx < targetList.length) {
      targetList[slotIdx].heroId = heroId;
    }

    const nextPhaseIndex = state.currentPhaseIndex + 1;
    const nextIsComplete = nextPhaseIndex >= state.phases.length;
    const nextHistory: LQHistoryEntry[] = [
      ...state.history,
      {
        phaseIndex: state.currentPhaseIndex,
        heroId,
        team: phase.team,
        action: phase.action,
      },
    ];

    set((prev) => {
      const updated = {
        ...prev,
        bansA: nextBansA,
        bansB: nextBansB,
        picksA: nextPicksA,
        picksB: nextPicksB,
        currentPhaseIndex: nextPhaseIndex,
        isComplete: nextIsComplete,
        selectedHeroId: null,
        history: nextHistory,
      };
      persistState(extractPersisted(updated));
      return updated;
    });

    return { action: phase.action, team: phase.team };
  },

  skipPhase: () => {
    const state = get();
    const phase = state.getCurrentPhase();
    if (!phase) return;
    const nextPhaseIndex = state.currentPhaseIndex + 1;
    const nextIsComplete = nextPhaseIndex >= state.phases.length;
    const nextHistory: LQHistoryEntry[] = [
      ...state.history,
      {
        phaseIndex: state.currentPhaseIndex,
        heroId: '__SKIP__',
        team: phase.team,
        action: phase.action,
      },
    ];
    set((prev) => {
      const updated = {
        ...prev,
        currentPhaseIndex: nextPhaseIndex,
        isComplete: nextIsComplete,
        selectedHeroId: null,
        history: nextHistory,
      };
      persistState(extractPersisted(updated));
      return updated;
    });
  },

  undo: () => {
    const state = get();
    if (state.history.length === 0) return;
    const last = state.history[state.history.length - 1];
    const nextHistory = state.history.slice(0, -1);

    const nextBansA = state.bansA.map((s) => ({ ...s }));
    const nextBansB = state.bansB.map((s) => ({ ...s }));
    const nextPicksA = state.picksA.map((s) => ({ ...s }));
    const nextPicksB = state.picksB.map((s) => ({ ...s }));

    if (last.heroId !== '__SKIP__') {
      let slotIdx = 0;
      for (let i = 0; i < last.phaseIndex; i++) {
        if (
          state.phases[i].action === last.action &&
          state.phases[i].team === last.team
        ) {
          slotIdx++;
        }
      }
      const targetList =
        last.action === 'ban'
          ? last.team === 'A'
            ? nextBansA
            : nextBansB
          : last.team === 'A'
          ? nextPicksA
          : nextPicksB;

      if (slotIdx >= 0 && slotIdx < targetList.length) {
        targetList[slotIdx].heroId = null;
      }
    }

    set((prev) => {
      const updated = {
        ...prev,
        bansA: nextBansA,
        bansB: nextBansB,
        picksA: nextPicksA,
        picksB: nextPicksB,
        currentPhaseIndex: last.phaseIndex,
        isComplete: false,
        selectedHeroId: null,
        history: nextHistory,
      };
      persistState(extractPersisted(updated));
      return updated;
    });
  },

  reset: () => {
    const { phases, picksA, picksB } = get();
    const freshBansA = createEmptySlots(phases, 'ban', 'A');
    const freshBansB = createEmptySlots(phases, 'ban', 'B');
    const freshPicksA = createEmptySlots(phases, 'pick', 'A').map((s, i) => ({
      ...s,
      playerName: picksA[i]?.playerName || '',
    }));
    const freshPicksB = createEmptySlots(phases, 'pick', 'B').map((s, i) => ({
      ...s,
      playerName: picksB[i]?.playerName || '',
    }));

    set((prev) => {
      const updated = {
        ...prev,
        bansA: freshBansA,
        bansB: freshBansB,
        picksA: freshPicksA,
        picksB: freshPicksB,
        currentPhaseIndex: 0,
        isComplete: false,
        selectedHeroId: null,
        history: [],
      };
      persistState(extractPersisted(updated));
      return updated;
    });
  },

  setPhases: (phases) => {
    const freshBansA = createEmptySlots(phases, 'ban', 'A');
    const freshBansB = createEmptySlots(phases, 'ban', 'B');
    const freshPicksA = createEmptySlots(phases, 'pick', 'A');
    const freshPicksB = createEmptySlots(phases, 'pick', 'B');

    set((prev) => {
      const updated = {
        ...prev,
        phases,
        bansA: freshBansA,
        bansB: freshBansB,
        picksA: freshPicksA,
        picksB: freshPicksB,
        currentPhaseIndex: 0,
        isComplete: false,
        selectedHeroId: null,
        history: [],
      };
      persistState(extractPersisted(updated));
      return updated;
    });
  },

  setTimerMax: (seconds) =>
    set((prev) => {
      const updated = { ...prev, timerMax: seconds };
      persistState(extractPersisted(updated));
      return updated;
    }),

  setTimerAutoSkip: (v) =>
    set((prev) => {
      const updated = { ...prev, timerAutoSkip: v };
      persistState(extractPersisted(updated));
      return updated;
    }),

  setScoreA: (score) =>
    set((prev) => {
      const updated = { ...prev, scoreA: Math.max(0, Math.min(99, score)) };
      persistState(extractPersisted(updated));
      return updated;
    }),

  setScoreB: (score) =>
    set((prev) => {
      const updated = { ...prev, scoreB: Math.max(0, Math.min(99, score)) };
      persistState(extractPersisted(updated));
      return updated;
    }),

  setBoLabel: (bo) =>
    set((prev) => {
      const updated = { ...prev, boLabel: bo };
      persistState(extractPersisted(updated));
      return updated;
    }),

  setPlayerName: (team, index, name) =>
    set((prev) => {
      const nextPicksA = prev.picksA.map((s, i) =>
        team === 'A' && i === index ? { ...s, playerName: name } : s
      );
      const nextPicksB = prev.picksB.map((s, i) =>
        team === 'B' && i === index ? { ...s, playerName: name } : s
      );
      const updated = { ...prev, picksA: nextPicksA, picksB: nextPicksB };
      persistState(extractPersisted(updated));
      return updated;
    }),

  swapSidesSlots: () =>
    set((prev) => {
      const nextPhases = prev.phases.map((p) => ({
        ...p,
        team: (p.team === 'A' ? 'B' : 'A') as TeamSide,
      }));
      const nextHistory = prev.history.map((h) => ({
        ...h,
        team: (h.team === 'A' ? 'B' : 'A') as TeamSide,
      }));
      const updated = {
        ...prev,
        phases: nextPhases,
        bansA: prev.bansB,
        bansB: prev.bansA,
        picksA: prev.picksB,
        picksB: prev.picksA,
        scoreA: prev.scoreB,
        scoreB: prev.scoreA,
        history: nextHistory,
      };
      persistState(extractPersisted(updated));
      return updated;
    }),
}));
