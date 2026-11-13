import type { Direction, GamePhase, GameProgressState, ZoneId } from './gameState';

export interface DialogueOption {
  label: string;
  isCorrect?: boolean;
  reply?: string[];
  onSelectId?: string;
}

export interface DialoguePayload {
  speakerName: string;
  speakerRole?: string;
  portraitKey?: string;
  itemIconKey?: string;
  lines: string[];
  options?: {
    prompt: string;
    choices: DialogueOption[];
  };
  onComplete?: (selectedChoice?: DialogueOption) => void;
}

export interface GameBridgeCallbacks {
  onStateChange: (state: GameProgressState) => void;
  onOpenDialogue: (payload: DialoguePayload) => void;
  onCloseDialogue: () => void;
  onItemBanner: (itemName: string, iconSrc: string) => void;
  onVictory: () => void;
}

export type VirtualButton = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start';

export type { Direction, GamePhase, GameProgressState, ZoneId };
