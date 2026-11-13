import Phaser from 'phaser';
import { DIALOGUES } from '../../data/dialogues.js';
import { inputHub } from '../controls';
import { retroAudio } from '../audio';
import {
  canStartProclamation,
  collectTesi,
  createInitialGameState,
  isAdjacentOrFacingTile,
  markNpcTalked,
} from '../gameState';
import type {
  DialogueOption,
  DialoguePayload,
  Direction,
  GameBridgeCallbacks,
  GameProgressState,
  ZoneId,
} from '../types';

const TILE = 32;

interface NpcEntity {
  id: string;
  name: string;
  role: string;
  spriteKey: string;
  sprite: Phaser.GameObjects.Image;
  emote: Phaser.GameObjects.Image;
  emoteType: 'exclaim' | 'dots' | 'heart';
  tileX: number;
  tileY: number;
  givesTesi?: boolean;
  isPresident?: boolean;
  rawConfig: Record<string, unknown>;
}

interface ColliderRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DoorTrigger {
  x: number;
  y: number;
  w: number;
  h: number;
  targetZone: ZoneId;
  spawnX: number;
  spawnY: number;
  spawnFacing: Direction;
}

export class WorldScene extends Phaser.Scene {
  private currentZone: ZoneId = 'cortile';
  private player!: Phaser.GameObjects.Sprite;
  private facing: Direction = 'up';
  private colliders: ColliderRect[] = [];
  private doors: DoorTrigger[] = [];
  private npcs: NpcEntity[] = [];
  private nearbyNpc: NpcEntity | null = null;
  private dialogueOpen = false;
  private transitioning = false;
  private stepTimer = 0;
  private worldW = 640;
  private worldH = 576;
  private doorHintArrow: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'WorldScene' });
  }

  init(data?: { zone?: ZoneId; spawnX?: number; spawnY?: number; facing?: Direction }) {
    this.currentZone = data?.zone ?? 'cortile';
    this.facing = data?.facing ?? 'up';
    this.dialogueOpen = false;
    this.transitioning = false;
    this.colliders = [];
    this.doors = [];
    this.npcs = [];
    this.nearbyNpc = null;
    this.doorHintArrow = null;

    if (!this.registry.get('progressState')) {
      this.registry.set('progressState', createInitialGameState(true));
    }
    const prevState = this.registry.get('progressState') as GameProgressState;
    const nextState: GameProgressState = {
      ...prevState,
      phase: 'playing',
      zone: this.currentZone,
      playerFacing: this.facing,
    };
    this.registry.set('progressState', nextState);
    this.notifyBridgeState(nextState);
  }

  create(data?: { zone?: ZoneId; spawnX?: number; spawnY?: number; facing?: Direction }) {
    document.body.dataset.state = 'playing';
    inputHub.clearAll();
    retroAudio.playTrack('game');

    if (this.currentZone === 'cortile') {
      this.buildCortileZone();
    } else {
      this.buildAulaZone();
    }

    const defaultSpawn =
      this.currentZone === 'cortile'
        ? { x: 10 * TILE - 16, y: 15 * TILE - 16 }
        : { x: 320, y: 512 };

    const sx = data?.spawnX ?? defaultSpawn.x;
    const sy = data?.spawnY ?? defaultSpawn.y;

    this.player = this.add.sprite(sx, sy, 'player_overworld', this.idleFrameFor(this.facing));
    this.player.setOrigin(0.5, 0.85);
    this.player.setDepth(this.player.y);

    // Entrambe le zone (Cortile e Aula) usano la stessa identica vista e proporzione (zoom 1.25, mappa 640x576)
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setZoom(1.25);
    this.cameras.main.startFollow(this.player, true, 0.18, 0.18);
    this.cameras.main.roundPixels = true;
    this.cameras.main.fadeIn(240, 12, 26, 18);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      if (!this.scene.isActive()) return;
      this.cameras.main.setSize(gameSize.width, gameSize.height);
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', onResize);
    });

    // Expose debug state attributes for verification
    document.body.dataset.zone = this.currentZone;
  }

  private idleFrameFor(dir: Direction): number {
    switch (dir) {
      case 'down':
        return 0;
      case 'up':
        return 3;
      case 'left':
        return 6;
      case 'right':
        return 9;
    }
  }

  private buildCortileZone() {
    this.worldW = 20 * TILE; // 640
    this.worldH = 18 * TILE; // 576

    // 1. Base erba su tutta la mappa
    for (let y = 3 * TILE; y < this.worldH; y += TILE) {
      for (let x = 0; x < this.worldW; x += TILE) {
        this.add.image(x + 16, y + 16, 'erba').setDepth(0);
      }
    }

    // 2. Cortile centrale pavimentato a mattoncini (x: 4..15 = 384px = 8 * 48px esatti, y: 3..16)
    for (let y = 3 * TILE; y < 17 * TILE; y += TILE) {
      for (let x = 4 * TILE; x < 16 * TILE; x += 48) {
        this.add.image(x + 24, y + 16, 'pavimento_mattoni').setDepth(1);
      }
    }
    // Cordoli laterali puliti tra prato e cortile
    this.add.rectangle(4 * TILE, 10 * TILE, 6, 14 * TILE, 0x8d99ae).setStrokeStyle(1, 0x4a4e69).setDepth(2);
    this.add.rectangle(16 * TILE, 10 * TILE, 6, 14 * TILE, 0x8d99ae).setStrokeStyle(1, 0x4a4e69).setDepth(2);

    // Vialetto centrale in pietra chiara verso le porte blu
    for (let y = 3 * TILE; y < 17 * TILE; y += TILE) {
      this.add.image(9 * TILE + 16, y + 16, 'pavimento_piastrelle').setDepth(2);
      this.add.image(10 * TILE + 16, y + 16, 'pavimento_piastrelle').setDepth(2);
    }
    this.add.rectangle(9 * TILE, 10 * TILE, 3, 14 * TILE, 0x6c757d).setDepth(3);
    this.add.rectangle(11 * TILE, 10 * TILE, 3, 14 * TILE, 0x6c757d).setDepth(3);

    // 3. Facciata dell'Università in alto (y: 0..96)
    this.add.rectangle(this.worldW / 2, 18, this.worldW, 36, 0x264653).setDepth(3);
    this.add.rectangle(this.worldW / 2, 36, this.worldW, 6, 0x1d3557).setDepth(4);
    for (let x = 0; x < this.worldW; x += TILE) {
      this.add.image(x + 16, 66, 'muro_liscio').setDepth(5);
    }
    // Finestre simmetriche sulla facciata
    const windowXs = [64, 144, 224, 416, 496, 576];
    for (const wx of windowXs) {
      this.add.image(wx, 64, 'finestra').setDepth(6);
    }
    // Insegna ingresso sopra le porte
    this.add.rectangle(320, 22, 176, 18, 0x1b4332).setStrokeStyle(2, 0xd8f3dc).setDepth(10);
    this.add
      .text(320, 22, 'FACOLTA\' DI LAUREA', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#fefae0',
      })
      .setOrigin(0.5)
      .setDepth(11);

    // Porte blu con maniglioni antipanico al centro della facciata
    this.add.image(320, 68, 'porta_doppia').setDepth(7);

    // Indicatore visivo sopra la porta (visibile quando hai la Tesi)
    this.doorHintArrow = this.add
      .text(320, 38, '▼ ENTRA IN AULA', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#ffd166',
        stroke: '#081c15',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({
      targets: this.doorHintArrow,
      y: 42,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });
    const st = this.registry.get('progressState') as GameProgressState;
    this.doorHintArrow.setVisible(st.hasTesi);

    // Siepi e alberelli pixel art decorativi lungo i lati dell'erba
    for (let y = 4 * TILE; y <= 16 * TILE; y += 2 * TILE) {
      this.drawPixelBush(44, y);
      this.drawPixelBush(this.worldW - 44, y);
    }
    for (let x = 48; x < this.worldW - 32; x += 64) {
      if (Math.abs(x - 320) > 84) {
        this.drawPixelBush(x, this.worldH - 20);
      }
    }

    // Collisioni perimetrali Cortile
    this.colliders.push({ x: 0, y: 0, w: this.worldW, h: 94 }); // Facciata alta
    this.colliders.push({ x: 0, y: 0, w: 68, h: this.worldH }); // Siepe sinistra
    this.colliders.push({ x: this.worldW - 68, y: 0, w: 68, h: this.worldH }); // Siepe destra
    this.colliders.push({ x: 0, y: this.worldH - 28, w: this.worldW, h: 28 }); // Bordo basso

    // Trigger ingresso dalle porte blu -> Aula (stesso asse centrale x=320 del Cortile)
    this.doors.push({
      x: 292,
      y: 88,
      w: 56,
      h: 22,
      targetZone: 'aula',
      spawnX: 320,
      spawnY: 512,
      spawnFacing: 'up',
    });

    // 4 Amici NPC nel Cortile
    for (const friend of DIALOGUES.friends) {
      this.spawnNpc({
        id: friend.id,
        name: friend.name,
        role: friend.role,
        spriteKey: friend.spriteKey,
        tileX: friend.tileX,
        tileY: friend.tileY,
        emoteType: friend.emote === 'heart' ? 'heart' : 'exclaim',
        givesTesi: Boolean(friend.givesTesi),
        rawConfig: friend as unknown as Record<string, unknown>,
      });
    }
  }

  private drawPixelBush(cx: number, cy: number) {
    const g = this.add.graphics();
    g.setDepth(cy + 12);
    g.fillStyle(0x1b4332, 1);
    g.fillRoundedRect(cx - 22, cy - 14, 44, 28, 8);
    g.fillStyle(0x2d6a4f, 1);
    g.fillRoundedRect(cx - 19, cy - 16, 38, 22, 7);
    g.fillStyle(0x52b788, 1);
    g.fillRect(cx - 12, cy - 12, 10, 6);
    g.fillRect(cx + 2, cy - 10, 8, 5);
  }

  private buildAulaZone() {
    // Stesse identiche dimensioni mappa dell'esterno (Cortile): 20x18 tile (640x576)
    this.worldW = 20 * TILE; // 640
    this.worldH = 18 * TILE; // 576

    // 1. Pavimento a piastrelle su tutta l'aula
    for (let y = 0; y < this.worldH; y += TILE) {
      for (let x = 0; x < this.worldW; x += TILE) {
        this.add.image(x + 16, y + 16, 'pavimento_piastrelle').setDepth(0);
      }
    }

    // 2. Pareti perimetrali alte + cornici (allineate ai margini x=64..576 del Cortile)
    this.add.rectangle(this.worldW / 2, 16, this.worldW, 32, 0x3b3a36).setDepth(2);
    for (let x = 0; x < this.worldW; x += TILE) {
      this.add.image(x + 16, 56, 'muro_liscio').setDepth(3);
    }

    // Muri con appendiabiti ai lati della parete frontale (x=64..160 e x=480..576)
    this.add.image(112, 56, 'muro_appendiabiti').setDepth(4);
    this.add.image(528, 56, 'muro_appendiabiti').setDepth(4);

    // Due porte blu simmetriche con maniglioni antipanico (sinistra e destra delle finestre)
    this.add.image(176, 56, 'porta_singola').setDepth(5);
    this.add.image(464, 56, 'porta_singola').setDepth(5);

    // Fila continua di finestre in alto al centro (x=192..448 = 4 moduli da 64px)
    for (let x = 192; x < 448; x += 64) {
      this.add.image(x + 32, 56, 'finestra').setDepth(4);
    }

    // Pareti laterali dell'Aula allineate con i bordi del Cortile (64px per lato)
    this.add.rectangle(32, this.worldH / 2, 64, this.worldH, 0x2b2a27).setDepth(6);
    this.add.rectangle(64, this.worldH / 2, 6, this.worldH, 0x4a4843).setDepth(7);
    this.add.rectangle(this.worldW - 32, this.worldH / 2, 64, this.worldH, 0x2b2a27).setDepth(6);
    this.add.rectangle(this.worldW - 64, this.worldH / 2, 6, this.worldH, 0x4a4843).setDepth(7);

    // Zoccolino inferiore con uscita centrale (x=320) di ritorno al Cortile
    this.add.rectangle(this.worldW / 2, this.worldH - 12, this.worldW, 24, 0x3b3a36).setDepth(6);
    this.add.rectangle(320, this.worldH - 18, 72, 16, 0x9b2226).setStrokeStyle(2, 0xfefae0).setDepth(7);
    this.add
      .text(320, this.worldH - 18, 'USCITA', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#fefae0',
      })
      .setOrigin(0.5)
      .setDepth(8);

    // 3. Lavagna bianca centrata a x=320 sotto le finestre
    this.add.image(320, 110, 'lavagna').setDepth(8);
    this.add
      .text(320, 108, 'SESSIONE DI LAUREA\n110 e LODE', {
        fontFamily: '"Silkscreen", monospace',
        fontSize: '8px',
        color: '#1d3557',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(9);

    // 4. Sedie da ufficio blu + Cattedra frontale + 3 Professori centrati a x=272, 320, 368
    const chairXs = [272, 320, 368];
    for (const cx of chairXs) {
      this.add.image(cx, 166, 'sedia_blu').setDepth(145);
    }

    // Spawn 3 Professori della Commissione dietro la cattedra
    for (const prof of DIALOGUES.commission) {
      this.spawnNpc({
        id: prof.id,
        name: prof.name,
        role: prof.role,
        spriteKey: prof.spriteKey,
        tileX: prof.tileX,
        tileY: prof.tileY,
        emoteType: 'dots',
        isPresident: Boolean(prof.isPresident),
        rawConfig: prof as unknown as Record<string, unknown>,
      });
    }

    // Cattedra frontale larga davanti ai 3 professori (centrata a x=320)
    const cattedraImg = this.add.image(320, 202, 'cattedra');
    cattedraImg.setScale(1.45, 1);
    cattedraImg.setDepth(204);
    this.colliders.push({ x: 240, y: 176, w: 160, h: 48 });

    // 5. File di banchi continui in legno (senza gambe verticali divisorie!) + sedie tonde
    // Corridoio centrale x=276..364 centrato su x=320 (come il vialetto del Cortile)
    const rowYs = [284, 364, 444];
    for (const ry of rowYs) {
      this.placeContinuousDeskRow(84, 4, ry); // Ala sinistra: 6 moduli continui (192px, x=84..276)
      this.placeContinuousDeskRow(364, 4, ry); // Ala destra: 6 moduli continui (192px, x=364..556)
    }

    // Collisioni perimetrali Aula (stessi margini laterali x=68..572 del Cortile)
    this.colliders.push({ x: 0, y: 0, w: this.worldW, h: 88 });
    this.colliders.push({ x: 0, y: 0, w: 68, h: this.worldH });
    this.colliders.push({ x: this.worldW - 68, y: 0, w: 68, h: this.worldH });
    this.colliders.push({ x: 0, y: this.worldH - 22, w: 280, h: 22 });
    this.colliders.push({ x: 360, y: this.worldH - 22, w: 280, h: 22 });

    // Trigger uscita: porta centrale in basso + le due porte blu simmetriche
    this.doors.push({
      x: 284,
      y: this.worldH - 28,
      w: 72,
      h: 28,
      targetZone: 'cortile',
      spawnX: 320,
      spawnY: 132,
      spawnFacing: 'down',
    });
    this.doors.push({
      x: 158,
      y: 74,
      w: 36,
      h: 24,
      targetZone: 'cortile',
      spawnX: 320,
      spawnY: 132,
      spawnFacing: 'down',
    });
    this.doors.push({
      x: 446,
      y: 74,
      w: 36,
      h: 24,
      targetZone: 'cortile',
      spawnX: 320,
      spawnY: 132,
      spawnFacing: 'down',
    });
  }

  private placeContinuousDeskRow(startX: number, middleCount: number, y: number) {
    // Estremità sinistra
    this.add.image(startX + 16, y, 'banco_sx').setDepth(y + 12);
    // Moduli centrali continui senza gambe divisorie
    for (let i = 0; i < middleCount; i++) {
      this.add.image(startX + 48 + i * 32, y, 'banco_centro').setDepth(y + 12);
    }
    // Estremità destra
    const totalW = (middleCount + 2) * 32;
    this.add.image(startX + totalW - 16, y, 'banco_dx').setDepth(y + 12);

    // Sedie tonde in legno posizionate dietro il banco continuo
    for (let sx = startX + 20; sx <= startX + totalW - 20; sx += 36) {
      this.add.image(sx, y + 22, 'sedia_tonda').setDepth(y + 28);
    }

    // Singolo rettangolo collisione per l'intera fila continua (banco + sedie)
    this.colliders.push({
      x: startX + 4,
      y: y - 10,
      w: totalW - 8,
      h: 42,
    });
  }

  private spawnNpc(cfg: {
    id: string;
    name: string;
    role: string;
    spriteKey: string;
    tileX: number;
    tileY: number;
    emoteType: 'exclaim' | 'dots' | 'heart';
    givesTesi?: boolean;
    isPresident?: boolean;
    rawConfig: Record<string, unknown>;
  }) {
    const wx = cfg.tileX * TILE + 16;
    const wy = cfg.tileY * TILE + 16;

    const sprite = this.add.image(wx, wy, cfg.spriteKey);
    sprite.setOrigin(0.5, 0.85);
    sprite.setDepth(wy);

    const emoteAsset =
      cfg.emoteType === 'heart'
        ? 'emote_heart'
        : cfg.emoteType === 'dots'
          ? 'emote_dots'
          : 'emote_exclaim';

    const isProf = cfg.id.startsWith('prof_');
    const emoteX = isProf ? wx + 16 : wx;
    const emoteY = isProf ? wy - 36 : wy - 52;
    const emote = this.add.image(emoteX, emoteY, emoteAsset);
    emote.setDepth(wy + 100);
    if (isProf) {
      emote.setScale(0.75);
    }
    emote.setVisible(false);

    // Etichetta nome discreta: per i professori targhetta sul bordo alto della cattedra (mai coperta dal giocatore)
    const shortLabel = isProf
      ? cfg.name.replace(/^Prof\.ssa\s+|^Prof\.\s+/, '')
      : cfg.name;
    const labelY = isProf ? 184 : wy + 8;
    const labelDepth = isProf ? 206 : wy + 2;

    this.add
      .text(wx, labelY, shortLabel, {
        fontFamily: '"Silkscreen", monospace',
        fontSize: isProf ? '7px' : '8px',
        color: '#fefae0',
        stroke: '#081c15',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(labelDepth);

    // Collisione NPC (tranne i professori che sono già dietro la cattedra)
    if (!isProf) {
      this.colliders.push({ x: wx - 12, y: wy - 16, w: 24, h: 18 });
    }

    this.npcs.push({
      id: cfg.id,
      name: cfg.name,
      role: cfg.role,
      spriteKey: cfg.spriteKey,
      sprite,
      emote,
      emoteType: cfg.emoteType,
      tileX: cfg.tileX,
      tileY: cfg.tileY,
      givesTesi: cfg.givesTesi,
      isPresident: cfg.isPresident,
      rawConfig: cfg.rawConfig,
    });
  }

  update(_time: number, delta: number) {
    if (this.transitioning) return;

    if (this.dialogueOpen) {
      // Gestione tasto A mentre un dialogo è gestito da React overlay
      return;
    }

    const dt = Math.min(delta, 50) / 1000;
    const dir = inputHub.getActiveDirection();
    const isRunning = inputHub.isBHeld();
    const speed = isRunning ? 168 : 108;

    if (dir) {
      this.facing = dir;
      let vx = 0;
      let vy = 0;
      if (dir === 'left') vx = -1;
      else if (dir === 'right') vx = 1;
      else if (dir === 'up') vy = -1;
      else if (dir === 'down') vy = 1;

      this.moveWithSlide(vx * speed * dt, vy * speed * dt);

      const animKey = `walk-${dir}`;
      if (this.player.anims.currentAnim?.key !== animKey || !this.player.anims.isPlaying) {
        this.player.play(animKey);
      }
      this.player.anims.timeScale = isRunning ? 1.45 : 1.0;

      this.stepTimer += dt;
      if (this.stepTimer >= (isRunning ? 0.18 : 0.27)) {
        this.stepTimer = 0;
        retroAudio.playStep();
      }
    } else {
      this.player.stop();
      this.player.setFrame(this.idleFrameFor(this.facing));
      this.stepTimer = 0.16;
    }

    this.player.setDepth(this.player.y);

    // Aggiorna prossimità NPC & nuvolette emote ("!", "...", cuore)
    this.updateNearbyNpc();

    // Controlla ingresso porte
    this.checkDoorTriggers();

    // Controlla interazione con tasto A
    if (inputHub.consumeA()) {
      this.tryInteract();
    }
  }

  private moveWithSlide(dx: number, dy: number) {
    const hw = 10;
    const hh = 7;

    if (dx !== 0) {
      const nx = Phaser.Math.Clamp(this.player.x + dx, hw, this.worldW - hw);
      if (!this.collidesAt(nx, this.player.y, hw, hh)) {
        this.player.x = nx;
      }
    }
    if (dy !== 0) {
      const ny = Phaser.Math.Clamp(this.player.y + dy, hh + 8, this.worldH - hh);
      if (!this.collidesAt(this.player.x, ny, hw, hh)) {
        this.player.y = ny;
      }
    }
  }

  private collidesAt(px: number, py: number, hw: number, hh: number): boolean {
    const left = px - hw;
    const right = px + hw;
    const top = py - hh - 4;
    const bottom = py + hh - 2;

    for (const c of this.colliders) {
      if (right > c.x && left < c.x + c.w && bottom > c.y && top < c.y + c.h) {
        return true;
      }
    }
    return false;
  }

  private updateNearbyNpc() {
    let closest: NpcEntity | null = null;
    let bestDist = Infinity;

    for (const npc of this.npcs) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        npc.sprite.x,
        npc.sprite.y
      );
      const isProf = npc.id.startsWith('prof_');
      const maxRange = isProf ? 72 : 68;
      const inRange = dist <= maxRange;
      const baseEmoteY = isProf ? npc.sprite.y - 36 : npc.sprite.y - 54;

      if (inRange && !npc.emote.visible) {
        npc.emote.setVisible(true);
        npc.emote.y = baseEmoteY + 8;
        this.tweens.add({
          targets: npc.emote,
          y: baseEmoteY,
          duration: 180,
          ease: 'Back.easeOut',
        });
        retroAudio.playEmote();
      } else if (!inRange && npc.emote.visible) {
        npc.emote.setVisible(false);
      }

      if (inRange && dist < bestDist) {
        bestDist = dist;
        closest = npc;
      }
    }

    this.nearbyNpc = closest;
  }

  private checkDoorTriggers() {
    for (const door of this.doors) {
      if (
        this.player.x >= door.x &&
        this.player.x <= door.x + door.w &&
        this.player.y >= door.y &&
        this.player.y <= door.y + door.h
      ) {
        this.enterZone(door);
        return;
      }
    }
  }

  private enterZone(door: DoorTrigger) {
    if (this.transitioning) return;
    this.transitioning = true;
    inputHub.clearAll();
    retroAudio.playDoor();

    this.cameras.main.fadeOut(260, 12, 26, 18);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({
        zone: door.targetZone,
        spawnX: door.spawnX,
        spawnY: door.spawnY,
        facing: door.spawnFacing,
      });
    });
  }

  private tryInteract() {
    const pTileX = Math.floor(this.player.x / TILE);
    const pTileY = Math.floor(this.player.y / TILE);

    let target = this.nearbyNpc;
    if (!target) {
      for (const npc of this.npcs) {
        if (isAdjacentOrFacingTile(pTileX, pTileY, this.facing, npc.tileX, npc.tileY)) {
          target = npc;
          break;
        }
      }
    }
    if (!target) return;

    this.openNpcDialogue(target);
  }

  private openNpcDialogue(npc: NpcEntity) {
    const bridge = this.registry.get('bridge') as GameBridgeCallbacks | undefined;
    let state = this.registry.get('progressState') as GameProgressState;
    state = markNpcTalked(state, npc.id);
    this.registry.set('progressState', state);
    this.notifyBridgeState(state);

    this.dialogueOpen = true;
    this.player.stop();
    this.player.setFrame(this.idleFrameFor(this.facing));
    inputHub.clearAll();
    retroAudio.playConfirm();

    // Feedback aptico (Web Vibration API) quando il giocatore interagisce con un NPC importante
    const isImportantNpc = Boolean(
      npc.givesTesi || npc.isPresident || npc.id.startsWith('prof_')
    );
    retroAudio.vibrateNpcInteraction(isImportantNpc);

    const cfg = npc.rawConfig;

    // 1. Amica custode della Tesi (Giulia)
    if (npc.givesTesi) {
      if (state.hasTesi) {
        this.showDialogue({
          speakerName: npc.name,
          speakerRole: npc.role,
          portraitKey: npc.spriteKey,
          lines: (cfg.linesAlreadyHasTesi as string[]) ?? ['Hai già la Tesi!'],
          onComplete: () => {
            this.dialogueOpen = false;
          },
        });
        return;
      }

      const quest = cfg.questQuestion as {
        prompt: string;
        options: Array<{ label: string; isCorrect: boolean; reply: string[] }>;
      };

      this.showDialogue({
        speakerName: npc.name,
        speakerRole: npc.role,
        portraitKey: npc.spriteKey,
        lines: (cfg.questIntro as string[]) ?? ['Vuoi la tua Tesi?'],
        options: {
          prompt: quest.prompt,
          choices: quest.options.map((o) => ({
            label: o.label,
            isCorrect: o.isCorrect,
            reply: o.reply,
          })),
        },
        onComplete: (chosen?: DialogueOption) => {
          this.dialogueOpen = false;
          if (chosen?.isCorrect) {
            const updated = collectTesi(this.registry.get('progressState') as GameProgressState);
            this.registry.set('progressState', updated);
            this.notifyBridgeState(updated);
            retroAudio.playItemFanfare();
            if (this.doorHintArrow) {
              this.doorHintArrow.setVisible(true);
            }
            bridge?.onItemBanner('Tesi di Laurea', '/assets/tesi.png');
          }
        },
      });
      return;
    }

    // 2. Presidente di Commissione (Prof. Rossi)
    if (npc.isPresident) {
      const check = canStartProclamation(state);
      if (!check.allowed && check.reason === 'missing_tesi') {
        this.showDialogue({
          speakerName: npc.name,
          speakerRole: npc.role,
          portraitKey: npc.spriteKey,
          lines: (cfg.linesWithoutTesi as string[]) ?? [
            'Manca la sua Tesi! La recuperi in Cortile.',
          ],
          onComplete: () => {
            this.dialogueOpen = false;
          },
        });
        return;
      }

      if (check.allowed) {
        this.showDialogue({
          speakerName: npc.name,
          speakerRole: npc.role,
          portraitKey: npc.spriteKey,
          itemIconKey: 'tesi',
          lines: (cfg.linesReadyForDefense as string[]) ?? [
            'Iniziamo la discussione della Tesi!',
          ],
          onComplete: () => {
            this.dialogueOpen = false;
            this.startProclamationSequence();
          },
        });
        return;
      }
    }

    // 3. Altri amici e commissari
    let lines: string[];
    if (cfg.linesBeforeTesi || cfg.linesAfterTesi) {
      lines = state.hasTesi
        ? ((cfg.linesAfterTesi as string[]) ?? (cfg.linesBeforeTesi as string[]))
        : ((cfg.linesBeforeTesi as string[]) ?? ['In bocca al lupo!']);
    } else {
      lines = (cfg.lines as string[]) ?? ['In bocca al lupo!'];
    }

    this.showDialogue({
      speakerName: npc.name,
      speakerRole: npc.role,
      portraitKey: npc.spriteKey,
      lines,
      onComplete: () => {
        this.dialogueOpen = false;
      },
    });
  }

  private showDialogue(payload: DialoguePayload) {
    const bridge = this.registry.get('bridge') as GameBridgeCallbacks | undefined;
    bridge?.onOpenDialogue(payload);
  }

  private notifyBridgeState(state: GameProgressState) {
    const bridge = this.registry.get('bridge') as GameBridgeCallbacks | undefined;
    bridge?.onStateChange(state);
  }

  private startProclamationSequence() {
    if (this.transitioning) return;
    this.transitioning = true;
    inputHub.clearAll();
    retroAudio.playTrack('battle', true);

    const prevState = this.registry.get('progressState') as GameProgressState;
    const nextState: GameProgressState = { ...prevState, phase: 'proclamation' };
    this.registry.set('progressState', nextState);
    this.notifyBridgeState(nextState);
    document.body.dataset.state = 'proclamation';

    // Classic Pokémon battle encounter flash!
    this.cameras.main.flash(320, 255, 255, 255);
    this.time.delayedCall(340, () => {
      this.cameras.main.fadeOut(280, 8, 28, 21);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('ProclamationScene');
      });
    });
  }
}
