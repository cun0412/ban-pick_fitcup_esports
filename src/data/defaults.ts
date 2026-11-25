import type { VetoPhase, BPPhase } from '../types';

export const VETO_BO1: VetoPhase[] = [
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'decider', team: 'A' },
];

export const VETO_BO3: VetoPhase[] = [
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'pick', team: 'A' },
  { action: 'side', team: 'B' },
  { action: 'pick', team: 'B' },
  { action: 'side', team: 'A' },
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'decider', team: 'A' },
];

export const VETO_BO5: VetoPhase[] = [
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'pick', team: 'A' },
  { action: 'side', team: 'B' },
  { action: 'pick', team: 'B' },
  { action: 'side', team: 'A' },
  { action: 'pick', team: 'A' },
  { action: 'side', team: 'B' },
  { action: 'pick', team: 'B' },
  { action: 'side', team: 'A' },
  { action: 'decider', team: 'A' },
];

// Mặc định: 2 đội cấm trước mỗi đội 5 tướng (tổng 10 lượt cấm),
// sau đó chọn theo thứ tự: A(1) -> B(2) -> A(2) -> B(2) -> A(2) -> B(1 còn lại)
export const LQ_DEFAULT_PHASES: BPPhase[] = [
  // Cấm trước: 5 lượt mỗi đội (tổng 10)
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  // Chọn sau: A1 -> B2 -> A2 -> B2 -> A2 -> B1
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'B' },
  { action: 'pick', team: 'B' },
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'B' },
  { action: 'pick', team: 'B' },
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'B' },
];

// Chế độ 3 ban mỗi đội
export const LQ_3BAN_PHASES: BPPhase[] = [
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'B' },
  { action: 'pick', team: 'B' },
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'B' },
  { action: 'pick', team: 'B' },
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'B' },
];

export const LQ_4BAN_PHASES: BPPhase[] = [
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'B' },
  { action: 'pick', team: 'B' },
  { action: 'pick', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'ban', team: 'A' },
  { action: 'ban', team: 'B' },
  { action: 'ban', team: 'A' },
  { action: 'pick', team: 'B' },
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'B' },
  { action: 'pick', team: 'A' },
  { action: 'pick', team: 'B' },
];

export const DEFAULT_ENABLED_MAPS = [
  'Summit', 'Abyss', 'Sunset', 'Lotus', 'Corrode', 'Haven', 'Bind'
];
