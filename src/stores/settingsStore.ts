import { create } from 'zustand';
import { fetchAppConfig, saveAppConfig } from '../lib/api';
import type { AppSettings, TeamConfig } from '../types';

const DEFAULT_TEAM_A: TeamConfig = { name: 'ĐỘI A', logo: '', color: '#3185FF' };
const DEFAULT_TEAM_B: TeamConfig = { name: 'ĐỘI B', logo: '', color: '#FF343F' };
const CONFIG_KEY = 'settings';

let saveTimer: number | null = null;
function persistSettings(s: AppSettings) {
  if (saveTimer) clearTimeout(saveTimer);
  const payload: AppSettings = {
    teamA: s.teamA,
    teamB: s.teamB,
    tournamentName: s.tournamentName,
    roundName: s.roundName,
    soundEnabled: s.soundEnabled,
    timerEnabled: s.timerEnabled,
    overlayBg: s.overlayBg,
  };
  saveTimer = window.setTimeout(() => {
    saveAppConfig(CONFIG_KEY, payload);
  }, 350);
}

interface SettingsActions {
  hydrate: () => Promise<void>;
  updateTeamA: (t: Partial<TeamConfig>) => void;
  updateTeamB: (t: Partial<TeamConfig>) => void;
  setTournament: (n: string) => void;
  setRound: (n: string) => void;
  toggleSound: () => void;
  toggleTimer: () => void;
  setOverlayBg: (bg: AppSettings['overlayBg']) => void;
  swapTeams: () => void;
  reset: () => void;
}

export const useSettingsStore = create<AppSettings & SettingsActions>((set) => ({
  teamA: DEFAULT_TEAM_A,
  teamB: DEFAULT_TEAM_B,
  tournamentName: 'FITCUP',
  roundName: 'Vòng bảng',
  soundEnabled: true,
  timerEnabled: true,
  overlayBg: 'dark',

  hydrate: async () => {
    const remote = await fetchAppConfig<Partial<AppSettings>>(CONFIG_KEY);
    if (remote) {
      set((s) => ({
        ...s,
        ...remote,
        teamA: { ...DEFAULT_TEAM_A, ...(remote.teamA || {}) },
        teamB: { ...DEFAULT_TEAM_B, ...(remote.teamB || {}) },
      }));
    }
  },

  updateTeamA: (t) =>
    set((s) => {
      const n = { ...s, teamA: { ...s.teamA, ...t } };
      persistSettings(n);
      return n;
    }),
  updateTeamB: (t) =>
    set((s) => {
      const n = { ...s, teamB: { ...s.teamB, ...t } };
      persistSettings(n);
      return n;
    }),
  setTournament: (name) =>
    set((s) => {
      const n = { ...s, tournamentName: name };
      persistSettings(n);
      return n;
    }),
  setRound: (name) =>
    set((s) => {
      const n = { ...s, roundName: name };
      persistSettings(n);
      return n;
    }),
  toggleSound: () =>
    set((s) => {
      const n = { ...s, soundEnabled: !s.soundEnabled };
      persistSettings(n);
      return n;
    }),
  toggleTimer: () =>
    set((s) => {
      const n = { ...s, timerEnabled: !s.timerEnabled };
      persistSettings(n);
      return n;
    }),
  setOverlayBg: (bg) =>
    set((s) => {
      const n = { ...s, overlayBg: bg };
      persistSettings(n);
      return n;
    }),
  swapTeams: () =>
    set((s) => {
      const n = { ...s, teamA: s.teamB, teamB: s.teamA };
      persistSettings(n);
      return n;
    }),
  reset: () => {
    const def: AppSettings = {
      teamA: DEFAULT_TEAM_A,
      teamB: DEFAULT_TEAM_B,
      tournamentName: 'FITCUP',
      roundName: 'Vòng bảng',
      soundEnabled: true,
      timerEnabled: true,
      overlayBg: 'dark',
    };
    persistSettings(def);
    set(def);
  },
}));
