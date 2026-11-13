import Phaser from 'phaser';
import { retroAudio } from '../audio';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    retroAudio.preloadBgm();
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x0f2419);
    bg.setOrigin(0.5);

    const barBg = this.add.rectangle(w / 2, h / 2 + 12, 180, 12, 0x1e3a2b);
    barBg.setStrokeStyle(2, 0x76c893);
    const barFill = this.add.rectangle(w / 2 - 86, h / 2 + 12, 0, 8, 0x52b788);
    barFill.setOrigin(0, 0.5);

    const txt = this.add
      .text(w / 2, h / 2 - 14, 'CARICAMENTO...', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#d8f3dc',
      })
      .setOrigin(0.5);

    this.load.on('progress', (val: number) => {
      barFill.width = Math.round(172 * val);
    });
    this.load.on('complete', () => {
      txt.setText('PRONTO!');
    });

    // Logo & player sprites
    this.load.image('logo', '/assets/logo.png');
    this.load.image('player_battle', '/assets/player_battle.png');
    this.load.image('player_portrait', '/assets/player_portrait.png');
    this.load.spritesheet('player_overworld', '/assets/player_overworld.png', {
      frameWidth: 32,
      frameHeight: 48,
    });

    // NPCs (friends + professors)
    for (let i = 1; i <= 4; i++) {
      this.load.image(`npc_amico_${i}`, `/assets/npc_amico_${i}.png`);
      this.load.image(`npc_prof_${i}`, `/assets/npc_prof_${i}.png`);
    }

    // Items & UI
    this.load.image('tesi', '/assets/tesi.png');
    this.load.image('tesi_iso', '/assets/tesi_iso.png');
    this.load.image('alloro', '/assets/alloro.png');
    this.load.image('emote_exclaim', '/assets/emote_exclaim.png');
    this.load.image('emote_dots', '/assets/emote_dots.png');
    this.load.image('emote_heart', '/assets/emote_heart.png');
    this.load.image('dialogue_box', '/assets/dialogue_box.png');

    // Environment & Tiles
    this.load.image('pavimento_piastrelle', '/assets/pavimento_piastrelle.png');
    this.load.image('erba', '/assets/erba.png');
    this.load.image('pavimento_mattoni', '/assets/pavimento_mattoni.png');
    this.load.image('pavimento_striscia', '/assets/pavimento_striscia.png');
    this.load.image('muro_appendiabiti', '/assets/muro_appendiabiti.png');
    this.load.image('muro_liscio', '/assets/muro_liscio.png');
    this.load.image('finestra', '/assets/finestra.png');
    this.load.image('porta_doppia', '/assets/porta_doppia.png');
    this.load.image('porta_singola', '/assets/porta_singola.png');
    this.load.image('banco_sx', '/assets/banco_sx.png');
    this.load.image('banco_centro', '/assets/banco_centro.png');
    this.load.image('banco_dx', '/assets/banco_dx.png');
    this.load.image('sedia_tonda', '/assets/sedia_tonda.png');
    this.load.image('cattedra', '/assets/cattedra.png');
    this.load.image('sedia_blu', '/assets/sedia_blu.png');
    this.load.image('lavagna', '/assets/lavagna.png');
  }

  create() {
    this.createPlayerAnimations();

    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    if (autostart) {
      document.body.dataset.state = 'playing';
      this.scene.start('WorldScene', { zone: 'cortile' });
    } else {
      document.body.dataset.state = 'title';
      this.scene.start('StartScene');
    }
  }

  private createPlayerAnimations() {
    if (this.anims.exists('walk-down')) return;

    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('player_overworld', { frames: [1, 0, 2, 0] }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNumbers('player_overworld', { frames: [4, 3, 5, 3] }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'walk-left',
      frames: this.anims.generateFrameNumbers('player_overworld', { frames: [7, 6, 8, 6] }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'walk-right',
      frames: this.anims.generateFrameNumbers('player_overworld', { frames: [10, 9, 11, 9] }),
      frameRate: 8,
      repeat: -1,
    });
  }
}
