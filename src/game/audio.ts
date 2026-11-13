export type BgmTrack = 'opening' | 'game' | 'battle';

const BGM_SOURCES: Record<BgmTrack, string> = {
  opening: '/assets/aistudio/1-44._Hall_of_Fame_699a9f11.mp3',
  game: '/assets/aistudio/1-25._Road_to_Lavender_Town___From_Vermillion_e7eb99d7.mp3',
  battle: '/assets/aistudio/22._Pok_mon_Battle_d001e8ea.mp3',
};

const ALL_BGM_TRACKS: BgmTrack[] = ['opening', 'game', 'battle'];
const BGM_VOLUME = 0.42;
// L'MP3 della battaglia contiene parlato giapponese dopo 01:03; cicliamo solo la parte musicale (0..62.2s)
const BATTLE_MUSIC_LOOP_END_SEC = 62.2;

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private tracks: Partial<Record<BgmTrack, HTMLAudioElement>> = {};
  private desiredTrack: BgmTrack | null = null;
  private activeTrack: BgmTrack | null = null;
  private unlockBound = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getOrCreateAudio(track: BgmTrack): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    let audio = this.tracks[track];
    if (!audio) {
      audio = new Audio(BGM_SOURCES[track]);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = BGM_VOLUME;
      audio.muted = this.muted;
      if (track === 'battle') {
        audio.addEventListener('timeupdate', () => {
          if (audio && audio.currentTime >= BATTLE_MUSIC_LOOP_END_SEC) {
            audio.currentTime = 0;
            if (audio.paused && this.desiredTrack === 'battle' && !this.muted) {
              audio.play().catch(() => {});
            }
          }
        });
      }
      this.tracks[track] = audio;
    }
    return audio;
  }

  public preloadBgm() {
    for (const t of ALL_BGM_TRACKS) {
      this.getOrCreateAudio(t);
    }
  }

  private bindUnlockListeners() {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;

    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (this.desiredTrack) {
        const audio = this.getOrCreateAudio(this.desiredTrack);
        if (audio && audio.paused) {
          audio.muted = this.muted;
          audio.volume = BGM_VOLUME;
          audio
            .play()
            .then(() => {
              this.activeTrack = this.desiredTrack;
              removeListeners();
            })
            .catch(() => {});
        } else if (audio && !audio.paused) {
          removeListeners();
        }
      }
    };

    const removeListeners = () => {
      this.unlockBound = false;
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };

    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('touchstart', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true, passive: true });
  }

  public playTrack(track: BgmTrack, restartFromZero = false) {
    this.desiredTrack = track;
    if (typeof document !== 'undefined') {
      document.body.dataset.bgm = track;
    }

    for (const other of ALL_BGM_TRACKS) {
      if (other === track) continue;
      const otherAudio = this.tracks[other];
      if (otherAudio && !otherAudio.paused) {
        otherAudio.pause();
        otherAudio.currentTime = 0;
      }
    }

    const target = this.getOrCreateAudio(track);
    if (!target) return;
    target.muted = this.muted;
    target.volume = BGM_VOLUME;

    if (restartFromZero) {
      target.currentTime = 0;
    }

    if (this.activeTrack === track && !target.paused) {
      return;
    }

    target
      .play()
      .then(() => {
        this.activeTrack = track;
      })
      .catch(() => {
        this.activeTrack = null;
        this.bindUnlockListeners();
      });
  }

  public getDesiredTrack(): BgmTrack | null {
    return this.desiredTrack;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    for (const t of ALL_BGM_TRACKS) {
      const a = this.tracks[t];
      if (a) {
        a.muted = muted;
      }
    }
    if (!muted && this.desiredTrack) {
      this.playTrack(this.desiredTrack);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Fornisce un leggero feedback aptico tramite Web Vibration API (su dispositivi supportati).
   */
  public vibrate(pattern: number | number[]) {
    if (typeof document !== 'undefined') {
      document.body.dataset.lastVibration = Array.isArray(pattern)
        ? pattern.join(',')
        : String(pattern);
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignora su browser che bloccano o non supportano navigator.vibrate
      }
    }
  }

  /**
   * Feedback aptico leggero quando si interagisce con un NPC (più marcato per NPC chiave).
   */
  public vibrateNpcInteraction(isImportant = false) {
    this.vibrate(isImportant ? [35, 25, 45] : 22);
  }

  /**
   * Feedback aptico celebrativo quando il giocatore raccoglie un oggetto (Tesi / Corona d'Alloro).
   */
  public vibrateItemPickup() {
    this.vibrate([60, 40, 95]);
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    volume = 0.06,
    delay = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  public playBlip() {
    this.playTone(620 + Math.random() * 80, 0.045, 'square', 0.035);
  }

  public playConfirm() {
    this.playTone(587.33, 0.06, 'square', 0.055, 0);
    this.playTone(880, 0.09, 'square', 0.055, 0.055);
  }

  public playCancel() {
    this.playTone(392, 0.06, 'triangle', 0.05, 0);
    this.playTone(261.63, 0.08, 'triangle', 0.05, 0.05);
  }

  public playEmote() {
    this.playTone(987.77, 0.05, 'square', 0.045, 0);
    this.playTone(1318.51, 0.08, 'square', 0.045, 0.045);
  }

  public playStep() {
    this.playTone(140 + Math.random() * 25, 0.035, 'triangle', 0.025);
  }

  public playDoor() {
    this.playTone(330, 0.07, 'square', 0.045, 0);
    this.playTone(440, 0.07, 'square', 0.045, 0.06);
    this.playTone(587, 0.11, 'square', 0.045, 0.12);
  }

  public playItemFanfare() {
    this.vibrateItemPickup();
    // Classic GBA key-item pickup arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, idx === 3 ? 0.28 : 0.1, 'square', 0.06, idx * 0.09);
    });
  }

  public playVictoryFanfare() {
    this.vibrate([70, 45, 70, 45, 130]);
    // Pokémon-inspired graduation fanfare
    const melody: Array<[number, number, number]> = [
      [523.25, 0.12, 0.0],
      [523.25, 0.12, 0.13],
      [523.25, 0.12, 0.26],
      [659.25, 0.28, 0.40],
      [587.33, 0.12, 0.72],
      [659.25, 0.12, 0.86],
      [783.99, 0.45, 1.0],
    ];
    melody.forEach(([freq, dur, delay]) => {
      this.playTone(freq, dur, 'square', 0.065, delay);
      this.playTone(freq * 0.5, dur, 'triangle', 0.04, delay);
    });
  }
}

export const retroAudio = new RetroAudioEngine();
