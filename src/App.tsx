import { useCallback, useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { Volume2, VolumeX } from 'lucide-react';
import { mountPhaserGame } from './game/createGame';
import { inputHub } from './game/controls';
import { retroAudio } from './game/audio';
import { createInitialGameState, getObjectiveLabel } from './game/gameState';
import type {
  DialogueOption,
  DialoguePayload,
  Direction,
  GameBridgeCallbacks,
  GameProgressState,
} from './game/types';
import { DialogueBox } from './components/DialogueBox';
import { HandheldControls } from './components/HandheldControls';
import { VictoryScreen } from './components/VictoryScreen';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const [gameState, setGameState] = useState<GameProgressState>(() => {
    const autostart =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('autostart') === '1';
    return createInitialGameState(autostart);
  });
  const [activeDialogue, setActiveDialogue] = useState<DialoguePayload | null>(null);
  const [itemBanner, setItemBanner] = useState<{ name: string; src: string } | null>(null);
  const [showVictory, setShowVictory] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showObjectiveToast, setShowObjectiveToast] = useState(false);
  const [muted, setMuted] = useState(false);

  const dialogueHandlersRef = useRef<{
    onA: () => void;
    onB: () => void;
    onDir: (dir: Direction) => void;
  } | null>(null);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const activeDialogueRef = useRef(activeDialogue);
  activeDialogueRef.current = activeDialogue;
  const showVictoryRef = useRef(showVictory);
  showVictoryRef.current = showVictory;
  const victoryOpenedAtRef = useRef(0);
  const showPauseRef = useRef(showPause);
  showPauseRef.current = showPause;

  const registerDialogueHandlers = useCallback(
    (
      handlers: {
        onA: () => void;
        onB: () => void;
        onDir: (dir: Direction) => void;
      } | null
    ) => {
      dialogueHandlersRef.current = handlers;
    },
    []
  );

  // Mount Phaser once and never tear down on React state updates
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let bannerTimer: number | null = null;

    const bridge: GameBridgeCallbacks = {
      onStateChange: (next) => {
        setGameState(next);
      },
      onOpenDialogue: (payload) => {
        setActiveDialogue(payload);
      },
      onCloseDialogue: () => {
        setActiveDialogue(null);
      },
      onItemBanner: (name, src) => {
        setItemBanner({ name, src });
        if (bannerTimer) window.clearTimeout(bannerTimer);
        bannerTimer = window.setTimeout(() => {
          setItemBanner(null);
        }, 2800);
      },
      onVictory: () => {
        victoryOpenedAtRef.current = Date.now();
        setActiveDialogue(null);
        setShowVictory(true);
      },
    };

    const game = mountPhaserGame(container, bridge);
    gameRef.current = game;

    return () => {
      if (bannerTimer) window.clearTimeout(bannerTimer);
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const handleFinishDialogue = useCallback((selected?: DialogueOption) => {
    const current = activeDialogueRef.current;
    setActiveDialogue(null);
    inputHub.clearAll();
    current?.onComplete?.(selected);
  }, []);

  const handleRestartGame = useCallback(() => {
    retroAudio.playConfirm();
    retroAudio.playTrack('game');
    setShowVictory(false);
    setShowPause(false);
    setActiveDialogue(null);
    setItemBanner(null);
    inputHub.clearAll();

    const fresh = createInitialGameState(true);
    setGameState(fresh);
    document.body.dataset.state = 'playing';

    const game = gameRef.current;
    if (game) {
      game.registry.set('progressState', fresh);
      game.scene.stop('ProclamationScene');
      game.scene.stop('StartScene');
      game.scene.start('WorldScene', { zone: 'cortile' });
    }
  }, []);

  const handlePressA = useCallback(() => {
    if (showVictoryRef.current) {
      if (Date.now() - victoryOpenedAtRef.current > 800) {
        handleRestartGame();
      }
      return;
    }
    if (showPauseRef.current) {
      setShowPause(false);
      return;
    }
    if (activeDialogueRef.current && dialogueHandlersRef.current) {
      dialogueHandlersRef.current.onA();
      return;
    }
    if (gameStateRef.current.phase === 'title') {
      retroAudio.playTrack('game');
    }
    inputHub.pressA();
  }, [handleRestartGame]);

  const handleBChange = useCallback((held: boolean) => {
    if (held && activeDialogueRef.current && dialogueHandlersRef.current) {
      dialogueHandlersRef.current.onB();
      return;
    }
    inputHub.setBHeld(held);
  }, []);

  const handleDirectionChange = useCallback((dir: Direction | null) => {
    if (activeDialogueRef.current) {
      inputHub.setDirectionHeld(null);
      return;
    }
    inputHub.setDirectionHeld(dir);
  }, []);

  const handleDirectionTap = useCallback((dir: Direction) => {
    if (activeDialogueRef.current && dialogueHandlersRef.current) {
      dialogueHandlersRef.current.onDir(dir);
    }
  }, []);

  const handlePressStart = useCallback(() => {
    if (showVictoryRef.current) {
      if (Date.now() - victoryOpenedAtRef.current > 800) {
        handleRestartGame();
      }
      return;
    }
    if (gameStateRef.current.phase === 'title') {
      retroAudio.playTrack('game');
      inputHub.pressStart();
      return;
    }
    if (!activeDialogueRef.current && gameStateRef.current.phase === 'playing') {
      retroAudio.playConfirm();
      setShowPause((p) => !p);
    }
  }, [handleRestartGame]);

  const handlePressSelect = useCallback(() => {
    if (gameStateRef.current.phase !== 'playing') return;
    retroAudio.playBlip();
    setShowObjectiveToast((v) => !v);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      retroAudio.setMuted(next);
      return next;
    });
  }, []);

  // Desktop keyboard controls (Arrows / WASD + Enter / Space + Shift + Esc/P)
  useEffect(() => {
    const keyToDir = (key: string): Direction | null => {
      switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          return 'up';
        case 'ArrowDown':
        case 's':
        case 'S':
          return 'down';
        case 'ArrowLeft':
        case 'a':
        case 'A':
          return 'left';
        case 'ArrowRight':
        case 'd':
        case 'D':
          return 'right';
        default:
          return null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const dir = keyToDir(e.key);
      if (dir) {
        e.preventDefault();
        if (activeDialogueRef.current && dialogueHandlersRef.current) {
          if (!e.repeat) dialogueHandlersRef.current.onDir(dir);
        } else if (!showPauseRef.current && !showVictoryRef.current) {
          inputHub.addDirectionHeld(dir, true);
        }
        return;
      }

      if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (!e.repeat) {
          handlePressA();
        }
        return;
      }

      if (e.key === 'Shift' || e.key === 'x' || e.key === 'X') {
        if (!e.repeat) handleBChange(true);
        return;
      }

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (!e.repeat) handlePressStart();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const dir = keyToDir(e.key);
      if (dir) {
        inputHub.addDirectionHeld(dir, false);
        return;
      }
      if (e.key === 'Shift' || e.key === 'x' || e.key === 'X') {
        handleBChange(false);
      }
    };

    const clearOnBlur = () => {
      inputHub.clearAll();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearOnBlur);
    document.addEventListener('visibilitychange', clearOnBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearOnBlur);
      document.removeEventListener('visibilitychange', clearOnBlur);
    };
  }, [handleBChange, handlePressA, handlePressStart]);

  const objectiveText = getObjectiveLabel(gameState);

  return (
    <main className="flex h-[100dvh] w-full flex-col items-center justify-center bg-[#08150f] sm:p-2">
      {/* Handheld Game Boy Color / Advance 9:16 Chassis */}
      <section
        aria-label="Console Pokémon Verde Alloro"
        className="flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-[#1a4331] shadow-[0_20px_60px_rgba(0,0,0,0.65)] sm:max-h-[860px] sm:rounded-[28px] sm:border-2 sm:border-[#0d241a]"
      >
        {/* === PARTE SUPERIORE: PURO SCHERMO GIOCO EDGE-TO-EDGE (ZERO BORDI LATERALI) === */}
        <div className="relative flex-1 w-full overflow-hidden bg-[#0c1a12]">
          {/* Phaser Canvas Mount (100% edge-to-edge) */}
          <div
            ref={mountRef}
            data-testid="phaser-viewport"
            className="h-full w-full"
          />

          {/* Compact Floating HUD only during active gameplay */}
          {gameState.phase === 'playing' && !activeDialogue && !showVictory && (
            <div className="pointer-events-none absolute top-2 left-2 z-10 bg-[#081c15]/80 px-2 py-1 border border-[#52b788]/60">
              <p className="font-['Silkscreen',monospace] text-[10px] text-[#fefae0]">
                {objectiveText}
              </p>
            </div>
          )}

          {/* Discreet Top-Right Inventory + Mute Button */}
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
            {gameState.phase !== 'title' && (
              <div
                className="flex items-center gap-1.5 bg-[#081c15]/80 px-1.5 py-1 border border-[#52b788]/50"
                title="Oggetti raccolti"
              >
                <img
                  src="/assets/tesi.png"
                  alt="Tesi"
                  className={`h-4 w-3 object-contain [image-rendering:pixelated] ${
                    gameState.hasTesi ? 'opacity-100' : 'opacity-25 grayscale'
                  }`}
                />
                <img
                  src="/assets/alloro.png"
                  alt="Corona d'Alloro"
                  className={`h-4 w-4 object-contain [image-rendering:pixelated] ${
                    gameState.hasAlloro ? 'opacity-100' : 'opacity-25 grayscale'
                  }`}
                />
              </div>
            )}

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                toggleMute();
              }}
              aria-label={muted ? 'Attiva audio' : 'Disattiva audio'}
              className="flex h-7 w-7 items-center justify-center bg-[#081c15]/80 text-[#d8f3dc] border border-[#52b788]/50 hover:bg-[#1b4332]"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          {/* Item Pickup Fanfare Banner */}
          {itemBanner && (
            <div className="pointer-events-none absolute top-11 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 border-2 border-[#d4a338] bg-[#fefae0] px-2.5 py-1.5 shadow-[0_3px_0_#081c15]">
              <img
                src={itemBanner.src}
                alt={itemBanner.name}
                className="h-6 w-6 object-contain [image-rendering:pixelated]"
              />
              <span className="whitespace-nowrap font-['Press_Start_2P',monospace] text-[8px] text-[#1b4332]">
                OTTENUTO: {itemBanner.name.toUpperCase()}
              </span>
            </div>
          )}

          {/* Select Objective Hint Overlay */}
          {showObjectiveToast && gameState.phase === 'playing' && !activeDialogue && (
            <div className="absolute inset-x-4 top-12 z-30 border-2 border-[#1b4332] bg-[#fefae0] p-2.5 text-center shadow-[0_4px_0_#081c15]">
              <p className="font-['Press_Start_2P',monospace] text-[8px] text-[#1b4332]">
                OBIETTIVO ATTUALE
              </p>
              <p className="mt-1.5 font-['Silkscreen',monospace] text-[10px] text-[#2d6a4f]">
                {objectiveText}
              </p>
              <p className="mt-1 font-['Silkscreen',monospace] text-[9px] text-[#6c757d]">
                Tesi: {gameState.hasTesi ? 'Raccolta ✓' : 'Mancante'}
              </p>
            </div>
          )}

          {/* Pause Menu */}
          {showPause && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#081c15]/80 p-4">
              <div className="flex w-full max-w-[240px] flex-col gap-2 border-[3px] border-[#1b4332] bg-[#fefae0] p-3 text-center shadow-[0_4px_0_#081c15]">
                <p className="font-['Press_Start_2P',monospace] text-[10px] text-[#1b4332]">
                  PAUSA
                </p>
                <p className="font-['Silkscreen',monospace] text-[9px] text-[#2d6a4f]">
                  {objectiveText}
                </p>
                <button
                  type="button"
                  onClick={() => setShowPause(false)}
                  className="mt-1 border-2 border-[#081c15] bg-[#2d6a4f] py-1.5 font-['Press_Start_2P',monospace] text-[8px] text-[#fefae0]"
                >
                  RIPRENDI
                </button>
                <button
                  type="button"
                  onClick={handleRestartGame}
                  className="border-2 border-[#081c15] bg-[#e9ecef] py-1.5 font-['Press_Start_2P',monospace] text-[8px] text-[#1b4332]"
                >
                  RICOMINCIA
                </button>
              </div>
            </div>
          )}

          {/* GBA Dialogue Overlay */}
          {activeDialogue && !showVictory && (
            <DialogueBox
              dialogue={activeDialogue}
              onFinish={handleFinishDialogue}
              registerActionHandlers={registerDialogueHandlers}
            />
          )}

          {/* Final Celebration Overlay */}
          {showVictory && <VictoryScreen onRestart={handleRestartGame} />}
        </div>

        {/* === PARTE INFERIORE: CONTROLLI VIRTUALI GAME BOY === */}
        <div className="flex h-[225px] shrink-0 flex-col border-t-[3px] border-[#0b1f16] bg-gradient-to-b from-[#1f4e39] to-[#153627] shadow-[inset_0_2px_0_rgba(255,255,255,0.12)]">
          <HandheldControls
            onDirectionChange={handleDirectionChange}
            onDirectionTap={handleDirectionTap}
            onPressA={handlePressA}
            onBChange={handleBChange}
            onPressStart={handlePressStart}
            onPressSelect={handlePressSelect}
            isTitle={gameState.phase === 'title'}
          />
        </div>
      </section>

      {/* Desktop Keyboard Hint */}
      <p className="mt-1.5 hidden font-['Silkscreen',monospace] text-[11px] text-[#95d5b2]/70 sm:block">
        Tastiera PC: Frecce / WASD Muovi · Spazio / Invio (A) · Shift (B) · Esc (Pausa)
      </p>
    </main>
  );
}
