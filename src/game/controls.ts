import type { Direction } from './types';

class VirtualInputHub {
  private heldDirs: Set<Direction> = new Set();
  private heldB = false;
  private aQueue = 0;
  private bQueue = 0;
  private startQueue = 0;
  private dirQueue: Direction[] = [];

  public setDirectionHeld(dir: Direction | null) {
    this.heldDirs.clear();
    if (dir) {
      this.heldDirs.add(dir);
    }
  }

  public addDirectionHeld(dir: Direction, active: boolean) {
    if (active) {
      this.heldDirs.add(dir);
      this.dirQueue.push(dir);
    } else {
      this.heldDirs.delete(dir);
    }
  }

  public getActiveDirection(): Direction | null {
    // Prefer most recently added or deterministic priority
    if (this.heldDirs.size === 0) return null;
    const list = Array.from(this.heldDirs);
    return list[list.length - 1];
  }

  public pressA() {
    this.aQueue += 1;
  }

  public consumeA(): boolean {
    if (this.aQueue > 0) {
      this.aQueue = 0;
      return true;
    }
    return false;
  }

  public setBHeld(held: boolean) {
    if (held && !this.heldB) {
      this.bQueue += 1;
    }
    this.heldB = held;
  }

  public isBHeld(): boolean {
    return this.heldB;
  }

  public consumeB(): boolean {
    if (this.bQueue > 0) {
      this.bQueue = 0;
      return true;
    }
    return false;
  }

  public pressStart() {
    this.startQueue += 1;
  }

  public consumeStart(): boolean {
    if (this.startQueue > 0) {
      this.startQueue = 0;
      return true;
    }
    return false;
  }

  public consumeDirectionPress(): Direction | null {
    if (this.dirQueue.length === 0) return null;
    return this.dirQueue.shift() ?? null;
  }

  public clearAll() {
    this.heldDirs.clear();
    this.heldB = false;
    this.aQueue = 0;
    this.bQueue = 0;
    this.startQueue = 0;
    this.dirQueue = [];
  }
}

export const inputHub = new VirtualInputHub();
