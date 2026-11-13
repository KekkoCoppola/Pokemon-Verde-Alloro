import Phaser from 'phaser';
import { inputHub } from '../controls';
import { retroAudio } from '../audio';
import type { GameBridgeCallbacks } from '../types';

interface LeafParticle {
  gfx: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  phase: number;
}

export class StartScene extends Phaser.Scene {
  private bgContainer!: Phaser.GameObjects.Container;
  private logoSprite!: Phaser.GameObjects.Image;
  private startPrompt!: Phaser.GameObjects.Text;
  private leaves: LeafParticle[] = [];
  private starting = false;

  constructor() {
    super({ key: 'StartScene' });
  }

  create() {
    this.starting = false;
    this.leaves = [];
    inputHub.clearAll();
    document.body.dataset.state = 'title';
    retroAudio.playTrack('opening');

    this.bgContainer = this.add.container(0, 0);
    this.buildStage(this.cameras.main.width, this.cameras.main.height);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      if (!this.scene.isActive()) return;
      this.cameras.main.setSize(gameSize.width, gameSize.height);
      this.buildStage(gameSize.width, gameSize.height);
    };

    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', onResize);
    });

    this.input.on('pointerdown', () => {
      this.beginAdventure();
    });
  }

  private buildStage(w: number, h: number) {
    this.bgContainer.removeAll(true);
    this.leaves = [];

    // Cielo luminoso + nuvole pixel
    const skyH = Math.round(h * 0.44);
    this.bgContainer.add(this.add.rectangle(w / 2, h / 2, w, h, 0x8ecae6));
    this.bgContainer.add(this.add.rectangle(w / 2, skyH * 0.45, w, skyH * 0.9, 0xb8e0f6));

    this.bgContainer.add(this.add.rectangle(w * 0.2, h * 0.1, 64, 14, 0xffffff, 0.85));
    this.bgContainer.add(this.add.rectangle(w * 0.23, h * 0.085, 36, 12, 0xffffff, 0.85));
    this.bgContainer.add(this.add.rectangle(w * 0.78, h * 0.14, 72, 14, 0xffffff, 0.82));
    this.bgContainer.add(this.add.rectangle(w * 0.81, h * 0.125, 42, 12, 0xffffff, 0.82));

    // Facciata Università a metà schermo
    const facadeY = Math.round(h * 0.48);
    this.bgContainer.add(this.add.rectangle(w / 2, facadeY - 46, w, 34, 0x264653));
    this.bgContainer.add(this.add.rectangle(w / 2, facadeY - 30, w, 6, 0x1d3557));
    for (let x = 0; x < w + 32; x += 32) {
      this.bgContainer.add(this.add.image(x + 16, facadeY, 'muro_liscio').setScale(1.1, 1.35));
    }
    for (let x = 36; x < w - 24; x += 72) {
      if (Math.abs(x - w / 2) > 48) {
        this.bgContainer.add(this.add.image(x, facadeY - 4, 'finestra').setScale(1.05));
      }
    }
    this.bgContainer.add(this.add.image(w / 2, facadeY, 'porta_doppia').setScale(1.15));

    // Cortile a mattoncini + prati verdi ai lati
    const groundTop = facadeY + 34;
    for (let y = groundTop; y < h + 32; y += 32) {
      for (let x = 0; x < w + 48; x += 48) {
        this.bgContainer.add(this.add.image(x + 24, y, 'pavimento_mattoni'));
      }
    }
    const grassEdge = Math.max(48, Math.round(w * 0.22));
    for (let y = groundTop + 28; y < h + 32; y += 32) {
      for (let x = 0; x < grassEdge; x += 32) {
        this.bgContainer.add(this.add.image(x + 16, y, 'erba'));
      }
      for (let x = w - grassEdge; x < w + 32; x += 32) {
        this.bgContainer.add(this.add.image(x + 16, y, 'erba'));
      }
    }

    // Leggero velo in basso per rendere ultra leggibile PREMI A / START
    this.bgContainer.add(this.add.rectangle(w / 2, h - 52, w, 104, 0x081c15, 0.72));

    // Foglie d'alloro pixel art fluttuanti
    const leafColors = [0x52b788, 0x74c69d, 0x2d6a4f, 0xffd166];
    for (let i = 0; i < 16; i++) {
      const rect = this.add.rectangle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        5,
        5,
        leafColors[i % leafColors.length]
      );
      this.bgContainer.add(rect);
      this.leaves.push({
        gfx: rect,
        vx: -14 - Math.random() * 14,
        vy: 16 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Logo animato grande e nitidissimo al centro-alto
    const logoScale = Math.min((w * 0.88) / 260, (h * 0.42) / 144);
    const logoY = Math.round(h * 0.34);
    this.logoSprite = this.add.image(w / 2, logoY, 'logo').setScale(logoScale);
    this.bgContainer.add(this.logoSprite);
    this.tweens.add({
      targets: this.logoSprite,
      y: logoY + 8,
      duration: 1400,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Unica scritta lampeggiante PREMI A / START (sempre leggibile anche durante il pulse)
    this.startPrompt = this.add
      .text(w / 2, h - 54, 'PREMI A / START', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#ffd166',
        stroke: '#081c15',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.bgContainer.add(this.startPrompt);
    this.tweens.add({
      targets: this.startPrompt,
      alpha: { from: 1, to: 0.42 },
      duration: 520,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    for (const leaf of this.leaves) {
      leaf.phase += dt * 3;
      leaf.gfx.x += (leaf.vx + Math.sin(leaf.phase) * 8) * dt;
      leaf.gfx.y += leaf.vy * dt;
      if (leaf.gfx.y > h + 8) {
        leaf.gfx.y = -6;
        leaf.gfx.x = Phaser.Math.Between(0, w + 40);
      }
      if (leaf.gfx.x < -8) {
        leaf.gfx.x = w + 6;
      }
    }

    if (!this.starting && (inputHub.consumeA() || inputHub.consumeStart())) {
      this.beginAdventure();
    }
  }

  public beginAdventure() {
    if (this.starting) return;
    this.starting = true;
    retroAudio.playConfirm();
    retroAudio.playTrack('game');
    if (this.startPrompt) {
      this.tweens.killTweensOf(this.startPrompt);
      this.startPrompt.setAlpha(1);
    }

    const bridge = this.registry.get('bridge') as GameBridgeCallbacks | undefined;
    document.body.dataset.state = 'playing';

    this.cameras.main.fadeOut(260, 12, 26, 18);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (bridge) {
        bridge.onStateChange({
          phase: 'playing',
          zone: 'cortile',
          hasTesi: false,
          hasAlloro: false,
          talkedNpcIds: [],
          playerTile: { x: 9, y: 15 },
          playerFacing: 'up',
          scoreGrade: '110 e Lode',
        });
      }
      this.scene.start('WorldScene', { zone: 'cortile' });
    });
  }
}
