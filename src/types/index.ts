// ===== TYPES CHUNG =====

export type HeroRole = 'Đấu sĩ' | 'Đỡ đòn' | 'Pháp sư' | 'Sát thủ' | 'Trợ thủ' | 'Xạ thủ' | '';

export interface LQHero {
  id: string;
  name: string;
  role: HeroRole;
  image: string;
  visible: boolean;
}

export type BPAction = 'ban' | 'pick';
export type TeamSide = 'A' | 'B';

export interface BPPhase {
  action: BPAction;
  team: TeamSide;
}

export interface BPSlot {
  heroId: string | null;
  playerName: string;
}

export interface LQState {
  heroes: LQHero[];
  phases: BPPhase[];
  currentPhaseIndex: number;
  bansA: BPSlot[];
  bansB: BPSlot[];
  picksA: BPSlot[];
  picksB: BPSlot[];
  selectedHeroId: string | null;
  timerMax: number;
  timerAutoSkip: boolean;
  isComplete: boolean;
  history: LQHistoryEntry[];
}

export interface LQHistoryEntry {
  phaseIndex: number;
  heroId: string;
  team: TeamSide;
  action: BPAction;
}

export interface TeamConfig {
  name: string;
  logo: string;
  color: string;
}

export interface ValorantMap {
  id: string;
  name: string;
  splash: string;
  listViewIcon: string;
  minimap: string;
  enabled: boolean;
  localSplash?: string;
  localIcon?: string;
}

export type VetoAction = 'ban' | 'pick' | 'side' | 'decider';
export type MapSide = 'attack' | 'defense' | null;

export interface VetoPhase {
  action: VetoAction;
  team: TeamSide;
}

export interface VetoEntry {
  mapId: string;
  action: VetoAction;
  team: TeamSide;
  side: MapSide;
  sideTeam: TeamSide | null;
  mapNumber?: number;
}

export type SpinStyle = 'wheel' | 'slot' | 'card';
export type BoType = 'bo1' | 'bo3' | 'bo5';

export interface SpinResult {
  mapId: string;
  mapNumber: number;
  timestamp: number;
  side?: { team: TeamSide; side: MapSide };
}

export interface SpinConfig {
  style: SpinStyle;
  duration: number;
  excludePicked: boolean;
  boType: BoType;
  spinPool: 'all' | 'remaining' | 'custom';
  customPool: string[];
  banBeforeSpin: boolean;
  bansPerTeam: number;
  autoSpinAll: boolean;
  autoSpinDelay: number;
  allowRespin: boolean;
}

export interface AppSettings {
  teamA: TeamConfig;
  teamB: TeamConfig;
  tournamentName: string;
  roundName: string;
  soundEnabled: boolean;
  timerEnabled: boolean;
  overlayBg: 'transparent' | 'chroma' | 'dark';
}

export interface BroadcastMsg {
  type: string;
  payload: any;
  timestamp: number;
}
