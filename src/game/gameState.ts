export type GamePhase = 'title' | 'playing' | 'paused' | 'proclamation' | 'victory';
export type ZoneId = 'cortile' | 'aula';
export type Direction = 'down' | 'up' | 'left' | 'right';

export interface GameProgressState {
  phase: GamePhase;
  zone: ZoneId;
  hasTesi: boolean;
  hasAlloro: boolean;
  talkedNpcIds: string[];
  playerTile: { x: number; y: number };
  playerFacing: Direction;
  scoreGrade: string;
}

export function createInitialGameState(autostart = false): GameProgressState {
  return {
    phase: autostart ? 'playing' : 'title',
    zone: 'cortile',
    hasTesi: false,
    hasAlloro: false,
    talkedNpcIds: [],
    playerTile: { x: 9, y: 15 },
    playerFacing: 'up',
    scoreGrade: '110 e Lode',
  };
}

export function markNpcTalked(state: GameProgressState, npcId: string): GameProgressState {
  if (state.talkedNpcIds.includes(npcId)) {
    return state;
  }
  return {
    ...state,
    talkedNpcIds: [...state.talkedNpcIds, npcId],
  };
}

export function collectTesi(state: GameProgressState): GameProgressState {
  return {
    ...state,
    hasTesi: true,
  };
}

export function awardAlloro(state: GameProgressState): GameProgressState {
  return {
    ...state,
    hasAlloro: true,
    phase: 'victory',
  };
}

export function canStartProclamation(state: GameProgressState): { allowed: boolean; reason: 'ok' | 'missing_tesi' | 'already_graduated' } {
  if (state.hasAlloro) {
    return { allowed: false, reason: 'already_graduated' };
  }
  if (!state.hasTesi) {
    return { allowed: false, reason: 'missing_tesi' };
  }
  return { allowed: true, reason: 'ok' };
}

export function getObjectiveLabel(state: GameProgressState): string {
  if (state.hasAlloro) {
    return 'Laureato 110 e Lode!';
  }
  if (!state.hasTesi) {
    return state.zone === 'cortile'
      ? 'Parla con Giulia per la Tesi'
      : 'Torna in Cortile a prendere la Tesi';
  }
  return state.zone === 'cortile'
    ? 'Entra dalle porte blu in Aula'
    : 'Parla col Presidente in cattedra';
}

export function isAdjacentOrFacingTile(
  playerX: number,
  playerY: number,
  facing: Direction,
  targetX: number,
  targetY: number
): boolean {
  const deltas: Record<Direction, { dx: number; dy: number }> = {
    down: { dx: 0, dy: 1 },
    up: { dx: 0, dy: -1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
  };
  const d = deltas[facing];
  if (playerX + d.dx === targetX && playerY + d.dy === targetY) {
    return true;
  }
  // Allow interacting if directly adjacent within Manhattan distance 1 (friendly on mobile touch)
  const dist = Math.abs(playerX - targetX) + Math.abs(playerY - targetY);
  return dist === 1;
}
