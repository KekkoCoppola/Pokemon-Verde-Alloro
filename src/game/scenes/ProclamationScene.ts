import Phaser from 'phaser';
import { DIALOGUES, GAME_CONFIG } from '../../data/dialogues.js';
import { inputHub } from '../controls';
import { retroAudio } from '../audio';
import { awardAlloro } from '../gameState';
import type { GameBridgeCallbacks, GameProgressState } from '../types';

export class ProclamationScene extends Phaser.Scene {
  private stageContainer!: Phaser.GameObjects.Container;
  private profSprite!: Phaser.GameObjects.Image;
  private alloroSprite!: Phaser.GameObjects.Image;
  private profHpBar!: Phaser.GameObjects.Rectangle;
  private battleStarted = false;

  constructor() {
    super({ key: 'ProclamationScene' });
  }

  create() {
    this.battleStarted = false;
    inputHub.clearAll();
    document.body.dataset.state = 'proclamation';
    retroAudio.playTrack('battle');

    this.stageContainer = this.add.container(0, 0);
    this.buildBattleStage(this.cameras.main.width, this.cameras.main.height);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      if (!this.scene.isActive()) return;
      this.cameras.main.setSize(gameSize.width, gameSize.height);
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', onResize);
    });

    this.cameras.main.fadeIn(300, 8, 28, 21);
    this.time.delayedCall(380, () => {
      if (!this.battleStarted) {
        this.battleStarted = true;
        this.runDefensePhase();
      }
    });
  }

  private buildBattleStage(w: number, h: number) {
    this.stageContainer.removeAll(true);

    // Sfondo battaglia stile Pokémon GBA
    this.stageContainer.add(this.add.rectangle(w / 2, h / 2, w, h, 0xe9f5db));
    this.stageContainer.add(this.add.rectangle(w / 2, h * 0.25, w, h * 0.5, 0xcfe1b9));

    // Area superiore dedicata all'arena (lascia i ~170px inferiori liberi per il DialogueBox/scelte)
    const arenaH = Math.max(240, h - 175);
    const enemyX = Math.round(w * 0.72);
    const enemyY = Math.round(arenaH * 0.44);
    const playerX = Math.round(w * 0.26);
    const playerY = Math.round(arenaH * 0.88);

    // Piattaforma Commissione (alto destra)
    this.stageContainer.add(this.add.ellipse(enemyX, enemyY + 14, 146, 38, 0x97a97c));
    this.stageContainer.add(this.add.ellipse(enemyX, enemyY + 12, 134, 28, 0xb5c99a));

    // Piattaforma Candidato (basso sinistra)
    this.stageContainer.add(this.add.ellipse(playerX, playerY, 160, 40, 0x97a97c));
    this.stageContainer.add(this.add.ellipse(playerX, playerY - 2, 146, 32, 0xb5c99a));

    // Sprite Commissione (3 professori compatti con Presidente al centro)
    this.stageContainer.add(this.add.image(enemyX - 38, enemyY - 2, 'npc_prof_2').setOrigin(0.5, 1).setScale(1.65));
    this.stageContainer.add(this.add.image(enemyX + 38, enemyY - 2, 'npc_prof_3').setOrigin(0.5, 1).setScale(1.65));
    this.profSprite = this.add.image(enemyX, enemyY + 4, 'npc_prof_1').setOrigin(0.5, 1).setScale(1.9);
    this.stageContainer.add(this.profSprite);

    // Sprite Candidato (player_battle.png)
    const playerSprite = this.add.image(playerX, playerY + 2, 'player_battle').setOrigin(0.5, 1).setScale(1.18);
    this.stageContainer.add(playerSprite);

    // Corona d'Alloro (nascosta finché non viene proclamato)
    this.alloroSprite = this.add.image(w / 2, -40, 'alloro').setScale(1.4).setVisible(false).setDepth(30);

    // Box stato Commissione (alto sinistra)
    const boxW = Math.min(200, Math.round(w * 0.52));
    const eBoxX = 14 + boxW / 2;
    const eBoxY = 46;
    this.stageContainer.add(this.add.rectangle(eBoxX, eBoxY, boxW, 56, 0xfefae0).setStrokeStyle(3, 0x1b4332));
    this.stageContainer.add(
      this.add.text(24, eBoxY - 16, 'COMMISSIONE LAUREA', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#1b4332',
      })
    );
    this.stageContainer.add(
      this.add.text(24, eBoxY - 2, 'LV. 110', {
        fontFamily: '"Silkscreen", monospace',
        fontSize: '10px',
        color: '#40916c',
      })
    );
    this.stageContainer.add(this.add.rectangle(eBoxX, eBoxY + 16, boxW - 24, 10, 0x2d6a4f));
    this.profHpBar = this.add.rectangle(26, eBoxY + 16, boxW - 28, 6, 0x52b788).setOrigin(0, 0.5);
    this.stageContainer.add(this.profHpBar);

    // Box stato Candidato (destra centro)
    const pBoxX = w - 14 - boxW / 2;
    const pBoxY = Math.round(arenaH * 0.72);
    this.stageContainer.add(this.add.rectangle(pBoxX, pBoxY, boxW, 60, 0xfefae0).setStrokeStyle(3, 0x1b4332));
    this.stageContainer.add(
      this.add.text(pBoxX - boxW / 2 + 12, pBoxY - 18, GAME_CONFIG.laureandoNome.toUpperCase(), {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#1b4332',
      })
    );
    this.stageContainer.add(
      this.add.text(pBoxX - boxW / 2 + 12, pBoxY - 3, 'TESI: PRONTA ✓', {
        fontFamily: '"Silkscreen", monospace',
        fontSize: '9px',
        color: '#9b2226',
      })
    );
    this.stageContainer.add(this.add.rectangle(pBoxX, pBoxY + 16, boxW - 24, 10, 0x2d6a4f));
    this.stageContainer.add(this.add.rectangle(pBoxX - boxW / 2 + 14, pBoxY + 16, boxW - 28, 6, 0x52b788).setOrigin(0, 0.5));
  }

  private runDefensePhase() {
    const bridge = this.registry.get('bridge') as GameBridgeCallbacks | undefined;
    if (!bridge) return;

    const proc = DIALOGUES.proclamation;
    bridge.onOpenDialogue({
      speakerName: 'Prof. Rossi',
      speakerRole: 'Discussione Finale',
      portraitKey: 'npc_prof_1',
      itemIconKey: 'tesi',
      lines: [proc.introText],
      options: {
        prompt: proc.questionPrompt,
        choices: proc.moves.map((m) => ({
          label: m.name,
          isCorrect: true,
          reply: [m.reaction],
        })),
      },
      onComplete: () => {
        this.animateCommissionImpressed();
      },
    });
  }

  private animateCommissionImpressed() {
    const bridge = this.registry.get('bridge') as GameBridgeCallbacks | undefined;
    retroAudio.playItemFanfare();

    this.cameras.main.flash(220, 255, 248, 210);
    this.tweens.add({
      targets: this.profSprite,
      x: this.profSprite.x + 6,
      duration: 60,
      yoyo: true,
      repeat: 5,
    });
    this.tweens.add({
      targets: this.profHpBar,
      width: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.showProclamationLines(bridge);
      },
    });
  }

  private showProclamationLines(bridge?: GameBridgeCallbacks) {
    if (!bridge) return;
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const targetY = Math.round(h * 0.36);

    this.alloroSprite.setVisible(true);
    this.tweens.add({
      targets: this.alloroSprite,
      y: targetY,
      duration: 700,
      ease: 'Bounce.easeOut',
    });
    retroAudio.playVictoryFanfare();

    bridge.onOpenDialogue({
      speakerName: 'Prof. Rossi',
      speakerRole: 'Proclamazione Ufficiale',
      portraitKey: 'npc_prof_1',
      itemIconKey: 'alloro',
      lines: DIALOGUES.proclamation.proclamationLines,
      onComplete: () => {
        const prevState = this.registry.get('progressState') as GameProgressState;
        const finalState = awardAlloro(prevState);
        this.registry.set('progressState', finalState);
        bridge.onStateChange(finalState);
        bridge.onItemBanner('Corona d\'Alloro · 110 e Lode!', '/assets/alloro.png');
        document.body.dataset.state = 'victory';
        bridge.onVictory();
      },
    });

    const colors = [0xffd166, 0x52b788, 0xe63946, 0xffffff];
    for (let i = 0; i < 16; i++) {
      const dot = this.add.rectangle(
        w / 2 + Phaser.Math.Between(-56, 56),
        targetY + Phaser.Math.Between(-30, 30),
        5,
        5,
        colors[i % colors.length]
      );
      dot.setDepth(35);
      this.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(18, 42),
        alpha: 0,
        duration: 1100 + i * 60,
        repeat: -1,
      });
    }
  }
}
