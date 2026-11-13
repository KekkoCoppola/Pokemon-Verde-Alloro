import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Direction } from '../game/types';

interface HandheldControlsProps {
  onDirectionChange: (dir: Direction | null) => void;
  onDirectionTap: (dir: Direction) => void;
  onPressA: () => void;
  onBChange: (held: boolean) => void;
  onPressStart: () => void;
  onPressSelect: () => void;
  isTitle?: boolean;
}

export function HandheldControls({
  onDirectionChange,
  onDirectionTap,
  onPressA,
  onBChange,
  onPressStart,
  onPressSelect,
  isTitle = false,
}: HandheldControlsProps) {
  const dpadRef = useRef<HTMLDivElement | null>(null);
  const [activeDir, setActiveDir] = useState<Direction | null>(null);
  const [aPressed, setAPressed] = useState(false);
  const [bPressed, setBPressed] = useState(false);
  const lastDirRef = useRef<Direction | null>(null);
  const activePointerId = useRef<number | null>(null);

  const computeDirectionFromPointer = (clientX: number, clientY: number): Direction | null => {
    const el = dpadRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) return null; // Deadzone al centro

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    }
    return dy > 0 ? 'down' : 'up';
  };

  const updateDir = (next: Direction | null) => {
    if (next !== lastDirRef.current) {
      lastDirRef.current = next;
      setActiveDir(next);
      onDirectionChange(next);
      if (next) {
        onDirectionTap(next);
      }
    }
  };

  const handleDpadPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    activePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateDir(computeDirectionFromPointer(e.clientX, e.clientY));
  };

  const handleDpadPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    updateDir(computeDirectionFromPointer(e.clientX, e.clientY));
  };

  const handleDpadPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    activePointerId.current = null;
    updateDir(null);
  };

  const tapDirectionButton = (dir: Direction) => {
    onDirectionTap(dir);
    onDirectionChange(dir);
    window.setTimeout(() => onDirectionChange(null), 110);
  };

  return (
    <div className="flex flex-1 flex-col justify-between px-4 pt-3 pb-3.5 select-none">
      {/* Main Controls Row: D-Pad Left + A/B Right */}
      <div className="my-auto flex items-center justify-between gap-3">
        {/* D-PAD (supports both thumb-slide drag & accessible directional buttons) */}
        <div
          ref={dpadRef}
          onPointerDown={handleDpadPointerDown}
          onPointerMove={handleDpadPointerMove}
          onPointerUp={handleDpadPointerUp}
          onPointerCancel={handleDpadPointerUp}
          data-testid="virtual-dpad"
          className="relative h-[132px] w-[132px] shrink-0 touch-none rounded-full bg-[#10291e]/55 p-2 shadow-[inset_0_3px_6px_rgba(0,0,0,0.45)]"
        >
          {/* Vertical bar */}
          <div className="absolute top-[9px] left-1/2 h-[114px] w-[40px] -translate-x-1/2 rounded-md border-2 border-[#0b1310] bg-[#2a2e33] shadow-[0_4px_0_#111315]" />
          {/* Horizontal bar */}
          <div className="absolute top-1/2 left-[9px] h-[40px] w-[114px] -translate-y-1/2 rounded-md border-2 border-[#0b1310] bg-[#2a2e33] shadow-[0_4px_0_#111315]" />
          {/* Center pivot */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#222529] shadow-[inset_0_2px_4px_rgba(0,0,0,0.65)]" />

          {/* Accessible directional hit targets */}
          <button
            type="button"
            aria-label="Muovi Su"
            onClick={(e) => {
              if (e.detail === 0) tapDirectionButton('up');
            }}
            className={`absolute top-[8px] left-1/2 flex h-[44px] w-[44px] -translate-x-1/2 items-center justify-center rounded-t-md transition-transform ${
              activeDir === 'up' ? 'translate-y-0.5 text-[#ffd166]' : 'text-[#9aa5b1]'
            }`}
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden="true">
              <polygon points="6,1 11,10 1,10" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Muovi Giù"
            onClick={(e) => {
              if (e.detail === 0) tapDirectionButton('down');
            }}
            className={`absolute bottom-[8px] left-1/2 flex h-[44px] w-[44px] -translate-x-1/2 items-center justify-center rounded-b-md transition-transform ${
              activeDir === 'down' ? 'translate-y-0.5 text-[#ffd166]' : 'text-[#9aa5b1]'
            }`}
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden="true">
              <polygon points="1,2 11,2 6,11" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Muovi Sinistra"
            onClick={(e) => {
              if (e.detail === 0) tapDirectionButton('left');
            }}
            className={`absolute top-1/2 left-[8px] flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-l-md transition-transform ${
              activeDir === 'left' ? 'translate-y-[-46%] text-[#ffd166]' : 'text-[#9aa5b1]'
            }`}
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden="true">
              <polygon points="1,6 10,1 10,11" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Muovi Destra"
            onClick={(e) => {
              if (e.detail === 0) tapDirectionButton('right');
            }}
            className={`absolute top-1/2 right-[8px] flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-r-md transition-transform ${
              activeDir === 'right' ? 'translate-y-[-46%] text-[#ffd166]' : 'text-[#9aa5b1]'
            }`}
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden="true">
              <polygon points="11,6 2,1 2,11" />
            </svg>
          </button>
        </div>

        {/* A / B Tactile Game Boy Buttons */}
        <div className="relative flex h-[126px] w-[142px] shrink-0 items-center justify-center rounded-2xl bg-[#10291e]/45 px-2 shadow-[inset_0_3px_6px_rgba(0,0,0,0.4)]">
          {/* B Button (lower-left) */}
          <div className="absolute bottom-2.5 left-3 flex flex-col items-center gap-0.5">
            <button
              type="button"
              aria-label="Tasto B - Corri o Annulla"
              onPointerDown={(e) => {
                e.preventDefault();
                setBPressed(true);
                onBChange(true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                setBPressed(false);
                onBChange(false);
              }}
              onPointerLeave={() => {
                if (bPressed) {
                  setBPressed(false);
                  onBChange(false);
                }
              }}
              onPointerCancel={() => {
                setBPressed(false);
                onBChange(false);
              }}
              onClick={(e) => {
                if (e.detail === 0) {
                  onBChange(true);
                  window.setTimeout(() => onBChange(false), 120);
                }
              }}
              className={`flex h-[54px] w-[54px] touch-none items-center justify-center rounded-full border-2 border-[#480c19] bg-[#b5173c] font-['Press_Start_2P',monospace] text-sm text-[#fff5f7] shadow-[0_4px_0_#590d22,inset_0_2px_3px_rgba(255,255,255,0.28)] transition-transform ${
                bPressed ? 'translate-y-1 shadow-[0_1px_0_#590d22]' : ''
              }`}
            >
              B
            </button>
            <span className="font-['Silkscreen',monospace] text-[9px] tracking-wide text-[#b7e4c7]">
              CORRI
            </span>
          </div>

          {/* A Button (upper-right) */}
          <div className="absolute top-2.5 right-3 flex flex-col items-center gap-0.5">
            <button
              type="button"
              aria-label="Tasto A - Interagisci o Conferma"
              data-start={isTitle ? 'true' : undefined}
              onPointerDown={(e) => {
                e.preventDefault();
                setAPressed(true);
                onPressA();
              }}
              onPointerUp={() => setAPressed(false)}
              onPointerLeave={() => setAPressed(false)}
              onPointerCancel={() => setAPressed(false)}
              onClick={(e) => {
                if (e.detail === 0) {
                  onPressA();
                }
              }}
              className={`flex h-[58px] w-[58px] touch-none items-center justify-center rounded-full border-2 border-[#480c19] bg-[#c9184a] font-['Press_Start_2P',monospace] text-base text-[#fff5f7] shadow-[0_4px_0_#590d22,inset_0_2px_3px_rgba(255,255,255,0.3)] transition-transform ${
                aPressed ? 'translate-y-1 shadow-[0_1px_0_#590d22]' : ''
              }`}
            >
              A
            </button>
            <span className="font-['Silkscreen',monospace] text-[9px] tracking-wide text-[#ffd166]">
              PARLA
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Pill Buttons: SELECT & START + Speaker Grille */}
      <div className="flex items-end justify-between pt-1">
        <div className="w-10" aria-hidden="true" />

        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              aria-label="Select - Obiettivo"
              onClick={onPressSelect}
              className="h-[20px] w-[44px] -rotate-12 rounded-full border border-[#0b1310] bg-[#343a40] shadow-[0_3px_0_#111315] active:translate-y-0.5 active:shadow-none"
            />
            <span className="font-['Silkscreen',monospace] text-[8px] tracking-wider text-[#95d5b2]">
              SELECT
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              aria-label="Start - Inizia o Pausa"
              onClick={onPressStart}
              className="h-[20px] w-[44px] -rotate-12 rounded-full border border-[#0b1310] bg-[#343a40] shadow-[0_3px_0_#111315] active:translate-y-0.5 active:shadow-none"
            />
            <span className="font-['Silkscreen',monospace] text-[8px] tracking-wider text-[#95d5b2]">
              START
            </span>
          </div>
        </div>

        <div className="flex -rotate-25 gap-1.5 opacity-60" aria-hidden="true">
          <span className="h-5 w-1 rounded-full bg-[#0b1f16]" />
          <span className="h-5 w-1 rounded-full bg-[#0b1f16]" />
          <span className="h-5 w-1 rounded-full bg-[#0b1f16]" />
          <span className="h-5 w-1 rounded-full bg-[#0b1f16]" />
        </div>
      </div>
    </div>
  );
}
