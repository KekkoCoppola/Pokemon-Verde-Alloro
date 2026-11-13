import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { StartScene } from './scenes/StartScene';
import { WorldScene } from './scenes/WorldScene';
import { ProclamationScene } from './scenes/ProclamationScene';
import type { GameBridgeCallbacks } from './types';

export function mountPhaserGame(
  parent: HTMLElement,
  bridge: GameBridgeCallbacks
): Phaser.Game {
  const width = Math.max(320, parent.clientWidth || 390);
  const height = Math.max(320, parent.clientHeight || 560);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: '#0c1a12',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, StartScene, WorldScene, ProclamationScene],
  };

  const game = new Phaser.Game(config);
  game.registry.set('bridge', bridge);
  return game;
}
