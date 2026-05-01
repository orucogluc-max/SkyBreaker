export enum GameState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export enum ShipType {
    STRIKER = 'STRIKER',
    JUGGERNAUT = 'JUGGERNAUT',
    PHANTOM = 'PHANTOM'
}

export interface ShipConfig {
    name: string;
    description: string;
    maxHealth: number;
    speedMultiplier: number;
    fireRateMultiplier: number;
    color: string;
}

export interface Projectile {
    id: number;
    x: number;
    z: number;
    vx: number; // Horizontal velocity
    vz: number; // Vertical velocity
    isEnemy: boolean;
    damage?: number;
    scale?: number;
    color?: string;
}

export type PowerUpType = 'SPREAD' | 'RAPID' | 'BLASTER';

export interface PowerUp {
  id: number;
  x: number;
  z: number;
  type: PowerUpType;
}

export interface ActiveWeapon {
  type: PowerUpType | 'DEFAULT';
  endTime: number;
}

export type EnemyType = 'ENEMY_BASIC' | 'ENEMY_TANK' | 'ENEMY_FAST' | 'ENEMY_SCREAMER' | 'ENEMY_BOSS' | 'ENEMY_STEALTH';

export interface Obstacle {
  id: number;
  x: number;
  z: number;
  type: EnemyType;
  health: number;
  maxHealth: number;
  width: number;
  
  // Movement State
  initialX: number;
  speedMultiplier: number;
  timeOffset: number; // For sine wave calcs
  
  // Combat State
  lastFireTime: number;
  fireRate: number;
  bulletPattern: 'NONE' | 'AIMED' | 'SPREAD' | 'CIRCLE';
}

export interface Drone {
  id: number;
  x: number;
  z: number;
  offsetX: number;
  offsetZ: number;
  lastFireTime: number;
}

export interface RunStats {
  maxSpeed: number;
  score: number;
  duration: number;
  difficulty: Difficulty;
  enemiesDestroyed: number;
  finalCombo: number;
}