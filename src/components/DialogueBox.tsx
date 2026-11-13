import { useEffect, useRef, useState } from 'react';
import { retroAudio } from '../game/audio';
import type { DialogueOption, DialoguePayload } from '../game/types';

interface DialogueBoxProps {
  dialogue: DialoguePayload;
  onFinish: (selected?: DialogueOption) => void;
  registerActionHandlers: (handlers: {
    onA: () => void;
    onB: () => void;
    onDir: (dir: 'up' | 'down' | 'left' | 'right') => void;
  } | null) => void;
}

export function DialogueBox({
  dialogue,
  onFinish,
  registerActionHandlers,
}: DialogueBoxProps) {
  const [activeLines, setActiveLines] = useState<string[]>(dialogue.lines);
  const [lineIndex, setLineIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [showingChoices, setShowingChoices] = useState(false);
  const [choiceIndex, setChoiceIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<DialogueOption | undefined>(undefined);
  const [inReplyPhase, setInReplyPhase] = useState(false);

  const currentFullText = activeLines[lineIndex] ?? '';
  const isTyping = charCount < currentFullText.length;

  // Reset when a new dialogue opens
  useEffect(() => {
    setActiveLines(dialogue.lines);
    setLineIndex(0);
    setCharCount(0);
    setShowingChoices(false);
    setChoiceIndex(0);
    setSelectedOption(undefined);
    setInReplyPhase(false);
  }, [dialogue]);

  // Typewriter timer
  useEffect(() => {
    if (showingChoices) return;
    if (charCount >= currentFullText.length) return;

    const timer = window.setTimeout(() => {
      setCharCount((c) => {
        const next = c + 1;
        if (next % 3 === 1) {
          retroAudio.playBlip();
        }
        return next;
      });
    }, 20);

    return () => window.clearTimeout(timer);
  }, [charCount, currentFullText.length, showingChoices]);

  const handleSelectChoice = (opt: DialogueOption) => {
    retroAudio.playConfirm();
    setSelectedOption(opt);
    setShowingChoices(false);

    if (opt.reply && opt.reply.length > 0) {
      setInReplyPhase(true);
      setActiveLines(opt.reply);
      setLineIndex(0);
      setCharCount(0);
    } else {
      onFinish(opt);
    }
  };

  const handleAdvance = () => {
    if (showingChoices && dialogue.options) {
      const opt = dialogue.options.choices[choiceIndex];
      if (opt) handleSelectChoice(opt);
      return;
    }

    if (isTyping) {
      setCharCount(currentFullText.length);
      return;
    }

    if (lineIndex < activeLines.length - 1) {
      retroAudio.playConfirm();
      setLineIndex((idx) => idx + 1);
      setCharCount(0);
      return;
    }

    // Reached end of active lines
    if (!inReplyPhase && dialogue.options && dialogue.options.choices.length > 0) {
      retroAudio.playConfirm();
      setShowingChoices(true);
      setChoiceIndex(0);
      return;
    }

    // If the user picked a wrong quiz answer during a mini-quest, let them retry!
    if (inReplyPhase && selectedOption && selectedOption.isCorrect === false && dialogue.options) {
      retroAudio.playCancel();
      setInReplyPhase(false);
      setShowingChoices(true);
      setChoiceIndex(0);
      return;
    }

    retroAudio.playConfirm();
    onFinish(selectedOption);
  };

  const handlersRef = useRef({
    onA: handleAdvance,
    onB: handleAdvance,
    onDir: (dir: 'up' | 'down' | 'left' | 'right') => {
      if (!showingChoices || !dialogue.options) return;
      const len = dialogue.options.choices.length;
      if (dir === 'up' || dir === 'left') {
        retroAudio.playBlip();
        setChoiceIndex((i) => (i - 1 + len) % len);
      } else if (dir === 'down' || dir === 'right') {
        retroAudio.playBlip();
        setChoiceIndex((i) => (i + 1) % len);
      }
    },
  });

  handlersRef.current = {
    onA: handleAdvance,
    onB: handleAdvance,
    onDir: (dir) => {
      if (!showingChoices || !dialogue.options) return;
      const len = dialogue.options.choices.length;
      if (dir === 'up' || dir === 'left') {
        retroAudio.playBlip();
        setChoiceIndex((i) => (i - 1 + len) % len);
      } else if (dir === 'down' || dir === 'right') {
        retroAudio.playBlip();
        setChoiceIndex((i) => (i + 1) % len);
      }
    },
  };

  useEffect(() => {
    registerActionHandlers({
      onA: () => handlersRef.current.onA(),
      onB: () => handlersRef.current.onB(),
      onDir: (d) => handlersRef.current.onDir(d),
    });
    return () => registerActionHandlers(null);
  }, [registerActionHandlers]);

  const portraitSrc = dialogue.portraitKey
    ? `/assets/${dialogue.portraitKey}.png`
    : '/assets/player_portrait.png';

  const itemSrc = dialogue.itemIconKey ? `/assets/${dialogue.itemIconKey}.png` : null;

  return (
    <div
      className="absolute inset-x-1.5 bottom-1.5 z-30 select-none"
      role="dialog"
      aria-label={`Dialogo con ${dialogue.speakerName}`}
      data-testid="gba-dialogue-box"
    >
      {/* Choice menu above dialogue box */}
      {showingChoices && dialogue.options && (
        <div className="mb-1.5 ml-auto w-[92%] border-[3px] border-[#1b4332] bg-[#fefae0] p-2 shadow-[0_3px_0_#081c15]">
          <p className="mb-1.5 font-['Silkscreen',monospace] text-[10px] leading-tight text-[#1b4332]">
            {dialogue.options.prompt}
          </p>
          <div className="flex flex-col gap-1">
            {dialogue.options.choices.map((opt, idx) => {
              const selected = idx === choiceIndex;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleSelectChoice(opt)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-left font-['Silkscreen',monospace] text-[10px] leading-tight transition-colors ${
                    selected
                      ? 'bg-[#2d6a4f] text-[#fefae0]'
                      : 'bg-[#ede9d0] text-[#1b4332] hover:bg-[#dfe6c8]'
                  }`}
                >
                  <span aria-hidden="true" className="w-2.5 shrink-0 text-[10px]">
                    {selected ? '▶' : ' '}
                  </span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main GBA Dialogue Frame */}
      <button
        type="button"
        onClick={handleAdvance}
        aria-label="Avanza dialogo"
        className="relative flex w-full items-stretch gap-2 border-[3px] border-[#0b1f16] bg-[#fffdf5] p-2 text-left shadow-[inset_0_0_0_2px_#d4a338,0_3px_0_#081c15] focus-visible:outline-2 focus-visible:outline-[#ffd166]"
      >
        {/* Speaker Portrait */}
        <div className="flex h-14 w-12 shrink-0 items-center justify-center border-2 border-[#1b4332] bg-[#e9f5db] p-0.5">
          <img
            src={portraitSrc}
            alt={dialogue.speakerName}
            className="h-full w-full object-contain [image-rendering:pixelated]"
          />
        </div>

        {/* Text area */}
        <div className="flex min-h-[56px] flex-1 flex-col justify-between pr-4">
          <div className="flex items-baseline gap-1.5 border-b border-[#d8e2dc] pb-0.5">
            <span className="font-['Press_Start_2P',monospace] text-[9px] text-[#1b4332]">
              {dialogue.speakerName}
            </span>
            {dialogue.speakerRole && (
              <span className="truncate font-['Silkscreen',monospace] text-[8px] text-[#52796f]">
                · {dialogue.speakerRole}
              </span>
            )}
          </div>

          <p className="mt-1 font-['Silkscreen',monospace] text-[11px] leading-[1.35] text-[#14211a]">
            {currentFullText.slice(0, charCount)}
          </p>
        </div>

        {/* Optional item preview */}
        {itemSrc && (
          <div className="flex h-12 w-10 shrink-0 items-center justify-center self-center border border-[#d4a338] bg-[#fefae0] p-1">
            <img
              src={itemSrc}
              alt="Oggetto"
              className="h-full w-full object-contain [image-rendering:pixelated]"
            />
          </div>
        )}

        {/* Blinking GBA advance triangle */}
        {!isTyping && !showingChoices && (
          <span
            aria-hidden="true"
            className="absolute right-2 bottom-1.5 animate-bounce font-['Press_Start_2P',monospace] text-[9px] text-[#c1121f]"
          >
            ▼
          </span>
        )}
      </button>
    </div>
  );
}
