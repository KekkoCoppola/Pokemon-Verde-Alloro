import { useEffect, useState } from 'react';
import { GAME_CONFIG } from '../data/dialogues.js';

interface VictoryScreenProps {
  onRestart: () => void;
}

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

const CONFETTI_COLORS = ['#ffd166', '#52b788', '#e63946', '#ffffff', '#74c69d'];

export function VictoryScreen({ onRestart }: VictoryScreenProps) {
  const [pieces] = useState<ConfettiPiece[]>(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: (i * 37) % 100,
      delay: (i % 7) * 0.25,
      duration: 2.2 + (i % 4) * 0.45,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: i % 3 === 0 ? 6 : 4,
    }))
  );

  useEffect(() => {
    const mountedAt = Date.now();
    const onKey = (e: KeyboardEvent) => {
      if (Date.now() - mountedAt < 800) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onRestart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRestart]);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-between overflow-hidden bg-[#133827] px-3 py-3 text-center"
      data-testid="victory-screen"
    >
      {/* Pixel art falling confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {pieces.map((p) => (
          <span
            key={p.id}
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              animation: `confetti-fall ${p.duration}s linear ${p.delay}s infinite`,
            }}
            className="absolute -top-3 block"
          />
        ))}
      </div>

      <div className="relative z-10 w-full">
        <p className="font-['Press_Start_2P',monospace] text-[10px] text-[#ffd166]">
          CONGRATULAZIONI!
        </p>
        <p className="mt-1 font-['Silkscreen',monospace] text-[10px] text-[#d8f3dc]">
          {GAME_CONFIG.corsoDiLaurea} · {GAME_CONFIG.votoFinale}
        </p>
      </div>

      {/* Player Battle Sprite + Laurel Wreath Celebration */}
      <div className="relative z-10 flex items-center justify-center gap-4">
        <div className="relative flex items-end justify-center">
          <img
            src="/assets/player_battle.png"
            alt="Laureato"
            className="h-[104px] w-auto object-contain [image-rendering:pixelated]"
          />
          <img
            src="/assets/alloro.png"
            alt="Corona d'Alloro"
            className="absolute -top-5 left-1/2 h-11 w-11 -translate-x-1/2 object-contain [image-rendering:pixelated]"
          />
        </div>

        <div className="flex flex-col items-start gap-1.5 border-2 border-[#d4a338] bg-[#fefae0] px-2.5 py-2 text-left shadow-[0_3px_0_#081c15]">
          <span className="font-['Press_Start_2P',monospace] text-[8px] text-[#1b4332]">
            DOTTORE!
          </span>
          <span className="font-['Silkscreen',monospace] text-[10px] text-[#9b2226]">
            {GAME_CONFIG.votoFinale}
          </span>
          <div className="flex items-center gap-1.5 pt-0.5">
            <img
              src="/assets/tesi.png"
              alt="Tesi"
              className="h-5 w-4 object-contain [image-rendering:pixelated]"
            />
            <img
              src="/assets/alloro.png"
              alt="Alloro"
              className="h-5 w-5 object-contain [image-rendering:pixelated]"
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex w-full items-center justify-center gap-2">
        <button
          type="button"
          data-start="true"
          onClick={onRestart}
          className="border-2 border-[#081c15] bg-[#ffd166] px-3 py-1.5 font-['Press_Start_2P',monospace] text-[8px] text-[#081c15] shadow-[0_3px_0_#081c15] active:translate-y-0.5 active:shadow-none"
        >
          GIOCA DI NUOVO
        </button>
      </div>
    </div>
  );
}
