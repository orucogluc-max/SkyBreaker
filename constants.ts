import { Difficulty, EnemyType, ShipType, ShipConfig } from './types';

interface GameConfig {
  SCROLL_SPEED: number;
  PLAYER_SPEED: number; // Lateral movement speed
  FIRE_RATE: number; 
  WAVE_INTERVAL: number;
}

export const SHIP_CONFIGS: Record<ShipType, ShipConfig> = {
    [ShipType.STRIKER]: {
        name: 'STRIKER',
        description: 'Balanced fighter. Good all-around performance.',
        maxHealth: 5,
        speedMultiplier: 1.0,
        fireRateMultiplier: 1.0,
        color: '#06b6d4' // cyan-500
    },
    [ShipType.JUGGERNAUT]: {
        name: 'JUGGERNAUT',
        description: 'Heavy armor, slow movement. Fires powerful but slower shots.',
        maxHealth: 8,
        speedMultiplier: 0.6,
        fireRateMultiplier: 1.5, // Slower fire rate
        color: '#f59e0b' // amber-500
    },
    [ShipType.PHANTOM]: {
        name: 'PHANTOM',
        description: 'Fragile but extremely fast. High rate of fire.',
        maxHealth: 3,
        speedMultiplier: 1.5,
        fireRateMultiplier: 0.6, // Faster fire rate
        color: '#a855f7' // purple-500
    }
};

export const GAME_CONFIG = {
  FIELD_WIDTH: 14, // Playable width
  FIELD_DEPTH: 20, // Playable depth (forward/backward range)
  PLAYER_Z: 10,   
  VISIBLE_Z_RANGE: 40, // How far ahead we can see
  PROJECTILE_SPEED_PLAYER: 40, 
  PROJECTILE_SPEED_ENEMY: 24, 
  COLLISION_RADIUS_PLAYER: 0.8,
  PLAYER_MAX_HEALTH: 5,
  INVULNERABILITY_TIME: 1000, 
};

export const ENEMY_CONFIGS: Record<EnemyType, { 
    HEALTH: number; 
    WIDTH: number; 
    SCORE: number; 
    SPEED_Z: number; // Relative to scroll
    FIRE_RATE: number; 
    BULLET_PATTERN: 'NONE' | 'AIMED' | 'SPREAD' | 'CIRCLE';
    COLOR_BODY: string;
    COLOR_ACCENT: string;
}> = {
    'ENEMY_BASIC': { 
        HEALTH: 60,
        WIDTH: 1.5,
        SCORE: 100,
        SPEED_Z: 1, // Matches scroll speed
        FIRE_RATE: 1500, 
        BULLET_PATTERN: 'AIMED',
        COLOR_BODY: '#9f1239', // Rose 800
        COLOR_ACCENT: '#fb7185', // Rose 300
    },
    'ENEMY_TANK': { 
        HEALTH: 600, 
        WIDTH: 3.0,  
        SCORE: 500,
        SPEED_Z: -1, // Moves slightly slower than scroll (approaches player slowly)
        FIRE_RATE: 2000, 
        BULLET_PATTERN: 'SPREAD',
        COLOR_BODY: '#1e3a8a', // Blue 900
        COLOR_ACCENT: '#fbbf24', // Amber 400
    },
    'ENEMY_FAST': { 
        HEALTH: 50, 
        WIDTH: 1.0, 
        SCORE: 200,
        SPEED_Z: 8, // Dives down fast
        FIRE_RATE: 0, 
        BULLET_PATTERN: 'NONE',
        COLOR_BODY: '#eab308', // Yellow 500
        COLOR_ACCENT: '#ffffff',
    },
    'ENEMY_SCREAMER': { 
        HEALTH: 120,
        WIDTH: 1.8,
        SCORE: 300,
        SPEED_Z: 4,
        FIRE_RATE: 1000,
        BULLET_PATTERN: 'CIRCLE',
        COLOR_BODY: '#701a75', // Fuchsia 900
        COLOR_ACCENT: '#22d3ee', // Cyan 400
    },
    'ENEMY_BOSS': {
        HEALTH: 2500,
        WIDTH: 5.0,
        SCORE: 2000,
        SPEED_Z: -2,
        FIRE_RATE: 700,
        BULLET_PATTERN: 'CIRCLE',
        COLOR_BODY: '#4c1d95', // Violet 900
        COLOR_ACCENT: '#f43f5e', // Rose 500
    },
    'ENEMY_STEALTH': {
        HEALTH: 90,
        WIDTH: 1.2,
        SCORE: 400,
        SPEED_Z: 3,
        FIRE_RATE: 800,
        BULLET_PATTERN: 'AIMED',
        COLOR_BODY: '#172554', // Blue 950
        COLOR_ACCENT: '#10b981', // Emerald 500
    }
};

export const DIFFICULTY_CONFIGS: Record<Difficulty, GameConfig> = {
  [Difficulty.EASY]: {
    SCROLL_SPEED: 18,
    PLAYER_SPEED: 0.8,
    FIRE_RATE: 150,
    WAVE_INTERVAL: 2500,
  },
  [Difficulty.MEDIUM]: {
    SCROLL_SPEED: 25,
    PLAYER_SPEED: 1.0,
    FIRE_RATE: 120,
    WAVE_INTERVAL: 2000,
  },
  [Difficulty.HARD]: {
    SCROLL_SPEED: 32,
    PLAYER_SPEED: 1.2,
    FIRE_RATE: 100,
    WAVE_INTERVAL: 1400,
  }
};

export const DRONE_CONFIG = {
    FIRE_RATE: 400,
    OFFSETS: [
        { x: -2.5, z: -1 },
        { x: 2.5, z: -1 },
        { x: -4, z: -2 },
        { x: 4, z: -2 }
    ]
};

export const PROGRESSION_CONFIG = {
    DIFFICULTY_SCALING_INTERVAL: 5000, // Every 5000 points
    SPEED_INCREMENT: 1.5,
    WAVE_INTERVAL_DECREMENT: 100,
    MIN_WAVE_INTERVAL: 600,
    DRONE_MILESTONES: [15000, 30000, 50000, 80000]
};