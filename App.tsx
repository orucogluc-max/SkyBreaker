import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Info, X } from 'lucide-react';
import { GameState, RunStats, Difficulty, Obstacle, Projectile, EnemyType, PowerUp, ActiveWeapon, ShipType, Drone } from './types';
import { DIFFICULTY_CONFIGS, GAME_CONFIG, ENEMY_CONFIGS, SHIP_CONFIGS, PROGRESSION_CONFIG, DRONE_CONFIG } from './constants';
import Background from './components/Background';
import HUD from './components/HUD';
import { getCrewChiefFeedback } from './services/geminiService';
import { audioService } from './src/services/audioService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const gameStateRef = useRef<GameState>(GameState.IDLE);
  
  // Game Logic Refs
  const scrollZRef = useRef(0); // The world moves, player stays relatively fixed in Z
  const scoreRef = useRef(0);
  const playerXRef = useRef(0); 
  const playerHealthRef = useRef(GAME_CONFIG.PLAYER_MAX_HEALTH);
  const comboRef = useRef(0);
  const lastHitTimeRef = useRef(0);
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const activeWeaponRef = useRef<ActiveWeapon>({ type: 'DEFAULT', endTime: 0 });
  const bombsRef = useRef(3);
  
  const enemiesDestroyedRef = useRef(0);
  const difficultyRef = useRef<Difficulty>(Difficulty.MEDIUM);
  const speedRef = useRef(0);
  
  const dronesRef = useRef<Drone[]>([]);
  const lastDifficultyScaleScoreRef = useRef(0);

  const [selectedShip, setSelectedShip] = useState<ShipType>(ShipType.STRIKER);
  const selectedShipRef = useRef<ShipType>(ShipType.STRIKER);
  const maxHealthRef = useRef(SHIP_CONFIGS[ShipType.STRIKER].maxHealth);

  const lastTimeRef = useRef(0);
  const lastFireTimeRef = useRef(0);
  const lastWaveTimeRef = useRef(0);
  const reqRef = useRef<number>();
  const startTimeRef = useRef(0);
  const configRef = useRef(DIFFICULTY_CONFIGS[Difficulty.MEDIUM]);
  
  // Input Refs
  const isDraggingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const lastPointerYRef = useRef(0);
  const targetPlayerXRef = useRef(0);
  const targetPlayerZOffsetRef = useRef(0);
  const playerZOffsetRef = useRef(0);
  const keysRef = useRef({ left: false, right: false, up: false, down: false });

  // UI State
  const [isHitState, setIsHitState] = useState(false);

  const [feedback, setFeedback] = useState<string>('');
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [finalStats, setFinalStats] = useState<RunStats | null>(null);
  
  const [isMuted, setIsMuted] = useState(audioService.isMuted);
  const [showInstructions, setShowInstructions] = useState(false);

  const toggleMute = () => {
      const muted = audioService.toggleMute();
      setIsMuted(muted);
  };

  const startGame = (difficulty: Difficulty) => {
    audioService.init();
    difficultyRef.current = difficulty;
    // Clone config to allow dynamic scaling without affecting base configs
    configRef.current = { ...DIFFICULTY_CONFIGS[difficulty] };
    speedRef.current = configRef.current.SCROLL_SPEED;
    
    selectedShipRef.current = selectedShip;
    maxHealthRef.current = SHIP_CONFIGS[selectedShip].maxHealth;
    playerHealthRef.current = SHIP_CONFIGS[selectedShip].maxHealth;

    setGameState(GameState.PLAYING);
    gameStateRef.current = GameState.PLAYING;
    
    scrollZRef.current = 0;
    scoreRef.current = 0;
    playerXRef.current = 0;
    targetPlayerXRef.current = 0;
    playerZOffsetRef.current = 0;
    targetPlayerZOffsetRef.current = 0;
    keysRef.current = { left: false, right: false, up: false, down: false };
    comboRef.current = 0;
    lastHitTimeRef.current = 0;
    
    obstaclesRef.current = [];
    projectilesRef.current = [];
    powerUpsRef.current = [];
    dronesRef.current = [];
    lastDifficultyScaleScoreRef.current = 0;
    activeWeaponRef.current = { type: 'DEFAULT', endTime: 0 };
    bombsRef.current = 3;
    enemiesDestroyedRef.current = 0;
    
    startTimeRef.current = performance.now();
    lastTimeRef.current = performance.now();
    lastFireTimeRef.current = 0;
    lastWaveTimeRef.current = 0;
    setFeedback('');
    
    reqRef.current = requestAnimationFrame(gameLoop);
  };

  const endGame = useCallback(async () => {
    if (reqRef.current) cancelAnimationFrame(reqRef.current);
    setGameState(GameState.GAME_OVER);
    gameStateRef.current = GameState.GAME_OVER;
    
    const duration = (performance.now() - startTimeRef.current) / 1000;
    const stats: RunStats = {
        maxSpeed: configRef.current.SCROLL_SPEED,
        score: scoreRef.current,
        duration: duration,
        difficulty: difficultyRef.current,
        enemiesDestroyed: enemiesDestroyedRef.current,
        finalCombo: comboRef.current
    };
    setFinalStats(stats);

    setIsLoadingFeedback(true);
    const msg = await getCrewChiefFeedback(stats);
    setFeedback(msg);
    setIsLoadingFeedback(false);
  }, []);

  const useBomb = () => {
      if (bombsRef.current <= 0 || gameStateRef.current !== GameState.PLAYING) return;
      
      bombsRef.current -= 1;
      audioService.playBomb();
      
      // Destroy all enemy projectiles
      projectilesRef.current = projectilesRef.current.filter(p => !p.isEnemy);
      
      // Damage all enemies on screen
      obstaclesRef.current.forEach(obs => {
          if (obs.z < scrollZRef.current + GAME_CONFIG.VISIBLE_Z_RANGE && obs.z > scrollZRef.current) {
              obs.health -= 500; // Massive damage
              if (obs.health <= 0) {
                  const scoreBase = ENEMY_CONFIGS[obs.type].SCORE;
                  scoreRef.current += scoreBase * (1 + (comboRef.current * 0.1));
                  comboRef.current += 1;
                  enemiesDestroyedRef.current++;
              }
          }
      });

      // Visual flash
      setIsHitState(true);
      setTimeout(() => setIsHitState(false), 200);
  };
  const takeDamage = (amount: number) => {
    const now = performance.now();
    if (now - lastHitTimeRef.current < GAME_CONFIG.INVULNERABILITY_TIME) return;

    playerHealthRef.current -= amount;
    lastHitTimeRef.current = now;
    audioService.playHit();
    
    comboRef.current = 0;
    setIsHitState(true);
    setTimeout(() => setIsHitState(false), 200);

    if (playerHealthRef.current <= 0) {
        playerHealthRef.current = 0;
        endGame();
    }
  };

  // --- WAVE SPAWNER ---
  const spawnWave = () => {
      const zStart = scrollZRef.current + GAME_CONFIG.VISIBLE_Z_RANGE + 5;
      const score = scoreRef.current;
      
      let patterns = ['V_SHAPE', 'LINE_ACROSS', 'HEAVY_ESCORT', 'STREAM'];
      
      // Add harder patterns as score increases
      if (score > 3000) patterns.push('STEALTH_ATTACK', 'DOUBLE_V');
      if (score > 8000) patterns.push('BOSS_ENCOUNTER', 'CHAOS');
      
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];

      const createEnemy = (type: EnemyType, x: number, zOffset: number) => {
          const config = ENEMY_CONFIGS[type];
          obstaclesRef.current.push({
              id: Math.random(),
              x: x,
              z: zStart + zOffset,
              type: type,
              health: config.HEALTH,
              maxHealth: config.HEALTH,
              width: config.WIDTH,
              speedMultiplier: 1, // Base multiplier
              initialX: x,
              timeOffset: Math.random() * 100,
              lastFireTime: performance.now() + Math.random() * 500,
              fireRate: config.FIRE_RATE,
              bulletPattern: config.BULLET_PATTERN
          });
      };

      if (pattern === 'V_SHAPE') {
          createEnemy('ENEMY_BASIC', 0, 0);
          createEnemy('ENEMY_BASIC', -2, 2);
          createEnemy('ENEMY_BASIC', 2, 2);
          createEnemy('ENEMY_BASIC', -4, 4);
          createEnemy('ENEMY_BASIC', 4, 4);
      } else if (pattern === 'LINE_ACROSS') {
          for(let i=-4; i<=4; i+=2) {
              createEnemy('ENEMY_BASIC', i, 0);
          }
      } else if (pattern === 'HEAVY_ESCORT') {
          createEnemy('ENEMY_TANK', 0, 5);
          createEnemy('ENEMY_FAST', -3, 0);
          createEnemy('ENEMY_FAST', 3, 0);
      } else if (pattern === 'STREAM') {
          createEnemy('ENEMY_SCREAMER', -3, 0);
          createEnemy('ENEMY_SCREAMER', 3, 4);
          createEnemy('ENEMY_SCREAMER', -3, 8);
      } else if (pattern === 'STEALTH_ATTACK') {
          createEnemy('ENEMY_STEALTH', -4, 0);
          createEnemy('ENEMY_STEALTH', 4, 0);
          createEnemy('ENEMY_STEALTH', -2, 3);
          createEnemy('ENEMY_STEALTH', 2, 3);
          createEnemy('ENEMY_STEALTH', 0, 6);
      } else if (pattern === 'DOUBLE_V') {
          createEnemy('ENEMY_FAST', 0, 0);
          createEnemy('ENEMY_FAST', -2, 2);
          createEnemy('ENEMY_FAST', 2, 2);
          createEnemy('ENEMY_SCREAMER', 0, 6);
          createEnemy('ENEMY_SCREAMER', -2, 8);
          createEnemy('ENEMY_SCREAMER', 2, 8);
      } else if (pattern === 'BOSS_ENCOUNTER') {
          createEnemy('ENEMY_BOSS', 0, 5);
          createEnemy('ENEMY_TANK', -4, 0);
          createEnemy('ENEMY_TANK', 4, 0);
      } else if (pattern === 'CHAOS') {
          createEnemy('ENEMY_TANK', 0, 0);
          createEnemy('ENEMY_SCREAMER', -3, 2);
          createEnemy('ENEMY_SCREAMER', 3, 2);
          createEnemy('ENEMY_STEALTH', -5, 4);
          createEnemy('ENEMY_STEALTH', 5, 4);
          createEnemy('ENEMY_FAST', -2, 6);
          createEnemy('ENEMY_FAST', 2, 6);
      }
  };

  const firePlayerShot = (time: number) => {
      const spawnZ = scrollZRef.current + GAME_CONFIG.PLAYER_Z + playerZOffsetRef.current + 1;
      const speed = GAME_CONFIG.PROJECTILE_SPEED_PLAYER;
      const score = scoreRef.current;
      const activeWeapon = activeWeaponRef.current.type;
      
      const spawnBullet = (xOffset: number, vx: number, damage = 35, scale = 1, color = '#22d3ee') => {
          projectilesRef.current.push({
              id: Math.random(),
              x: playerXRef.current + xOffset,
              z: spawnZ,
              vx: vx,
              vz: speed,
              isEnemy: false,
              damage,
              scale,
              color
          });
      };

      if (activeWeapon === 'SPREAD') {
          spawnBullet(0, 0, 40, 1.2, '#a855f7');
          spawnBullet(0.5, speed * 0.15, 40, 1.2, '#a855f7');
          spawnBullet(-0.5, -speed * 0.15, 40, 1.2, '#a855f7');
          spawnBullet(1.0, speed * 0.3, 40, 1.2, '#a855f7');
          spawnBullet(-1.0, -speed * 0.3, 40, 1.2, '#a855f7');
          audioService.playShoot();
      } else if (activeWeapon === 'RAPID') {
          spawnBullet(-0.3, 0, 20, 0.8, '#facc15');
          spawnBullet(0.3, 0, 20, 0.8, '#facc15');
          audioService.playShoot();
      } else if (activeWeapon === 'BLASTER') {
          spawnBullet(0, 0, 200, 3.0, '#ef4444');
          audioService.playShoot();
      } else {
          audioService.playShoot();
          if (score < 2000) {
              // Level 1: Dual cannons
              spawnBullet(-0.5, 0);
              spawnBullet(0.5, 0);
          } else if (score < 5000) {
              // Level 2: Dual cannons + slight spread
              spawnBullet(-0.5, 0);
              spawnBullet(0.5, 0);
              spawnBullet(-0.8, -speed * 0.1);
              spawnBullet(0.8, speed * 0.1);
          } else if (score < 10000) {
              // Level 3: Quad cannons + spread
              spawnBullet(-0.3, 0);
              spawnBullet(0.3, 0);
              spawnBullet(-0.8, 0);
              spawnBullet(0.8, 0);
              spawnBullet(-1.2, -speed * 0.15);
              spawnBullet(1.2, speed * 0.15);
          } else {
              // Level 4: Max power
              spawnBullet(-0.3, 0);
              spawnBullet(0.3, 0);
              spawnBullet(-0.8, 0);
              spawnBullet(0.8, 0);
              spawnBullet(-1.2, -speed * 0.15);
              spawnBullet(1.2, speed * 0.15);
              spawnBullet(-1.6, -speed * 0.3);
              spawnBullet(1.6, speed * 0.3);
          }
      }
      
      lastFireTimeRef.current = time;
  };

  const fireEnemyShot = (obs: Obstacle, time: number) => {
      if (obs.bulletPattern === 'NONE') return;

      const spawnBullet = (vx: number, vz: number) => {
        projectilesRef.current.push({
            id: Math.random(),
            x: obs.x,
            z: obs.z - 1,
            vx: vx,
            vz: -vz, // Fire backwards relative to world
            isEnemy: true
        });
      };

      const speed = GAME_CONFIG.PROJECTILE_SPEED_ENEMY;

      if (obs.bulletPattern === 'AIMED') {
          // Calculate vector to player
          const dx = playerXRef.current - obs.x;
          const dz = (scrollZRef.current + GAME_CONFIG.PLAYER_Z + playerZOffsetRef.current) - obs.z;
          const dist = Math.sqrt(dx*dx + dz*dz);
          spawnBullet((dx/dist) * speed, (Math.abs(dz)/dist) * speed);
      } 
      else if (obs.bulletPattern === 'SPREAD') {
          // 5-way spread
          spawnBullet(0, speed); // Center
          spawnBullet(speed * 0.3, speed * 0.9); // Right
          spawnBullet(-speed * 0.3, speed * 0.9); // Left
          spawnBullet(speed * 0.6, speed * 0.8); // Far Right
          spawnBullet(-speed * 0.6, speed * 0.8); // Far Left
      }
      else if (obs.bulletPattern === 'CIRCLE') {
         // Radial burst
         const count = 10;
         for(let i=0; i<count; i++) {
             const angle = (i / count) * Math.PI * 2;
             spawnBullet(Math.cos(angle) * speed, Math.sin(angle) * speed);
         }
      }
      
      audioService.playEnemyShoot();
      obs.lastFireTime = time;
  };

  const gameLoop = (time: number) => {
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;
    const dtSec = dt / 1000;
    const config = configRef.current;

    // 0. Progression & Difficulty Scaling
    if (scoreRef.current - lastDifficultyScaleScoreRef.current > PROGRESSION_CONFIG.DIFFICULTY_SCALING_INTERVAL) {
        lastDifficultyScaleScoreRef.current = scoreRef.current;
        config.SCROLL_SPEED += PROGRESSION_CONFIG.SPEED_INCREMENT;
        config.WAVE_INTERVAL = Math.max(PROGRESSION_CONFIG.MIN_WAVE_INTERVAL, config.WAVE_INTERVAL - PROGRESSION_CONFIG.WAVE_INTERVAL_DECREMENT);
        speedRef.current = config.SCROLL_SPEED;
    }

    // 0.5 Drone Milestones
    const currentDroneCount = dronesRef.current.length;
    if (currentDroneCount < PROGRESSION_CONFIG.DRONE_MILESTONES.length) {
        if (scoreRef.current >= PROGRESSION_CONFIG.DRONE_MILESTONES[currentDroneCount]) {
            const offset = DRONE_CONFIG.OFFSETS[currentDroneCount];
            dronesRef.current.push({
                id: Math.random(),
                x: playerXRef.current + offset.x,
                z: scrollZRef.current + GAME_CONFIG.PLAYER_Z + playerZOffsetRef.current + offset.z,
                offsetX: offset.x,
                offsetZ: offset.z,
                lastFireTime: time
            });
            audioService.playPowerUp(); 
        }
    }

    // 1. World Scroll
    scrollZRef.current += config.SCROLL_SPEED * dtSec;
    scoreRef.current += config.SCROLL_SPEED * dtSec * 10;

    // 1.5 Player Movement (Keyboard & Lerping)
    const currentShipSpeed = config.PLAYER_SPEED * SHIP_CONFIGS[selectedShipRef.current].speedMultiplier;
    if (keysRef.current.left) {
        targetPlayerXRef.current -= currentShipSpeed * dtSec * 15;
    }
    if (keysRef.current.right) {
        targetPlayerXRef.current += currentShipSpeed * dtSec * 15;
    }
    if (keysRef.current.up) {
        targetPlayerZOffsetRef.current += currentShipSpeed * dtSec * 15;
    }
    if (keysRef.current.down) {
        targetPlayerZOffsetRef.current -= currentShipSpeed * dtSec * 15;
    }

    const limitX = GAME_CONFIG.FIELD_WIDTH / 2;
    targetPlayerXRef.current = Math.max(-limitX, Math.min(limitX, targetPlayerXRef.current));

    const limitZ = GAME_CONFIG.FIELD_DEPTH / 2;
    targetPlayerZOffsetRef.current = Math.max(-limitZ, Math.min(limitZ, targetPlayerZOffsetRef.current));

    // Smooth lerp towards target
    playerXRef.current += (targetPlayerXRef.current - playerXRef.current) * 15 * dtSec;
    playerZOffsetRef.current += (targetPlayerZOffsetRef.current - playerZOffsetRef.current) * 15 * dtSec;

    // 2. Wave Spawning
    if (time - lastWaveTimeRef.current > config.WAVE_INTERVAL) {
        spawnWave();
        lastWaveTimeRef.current = time;
    }

    // 2.5 Powerups
    if (activeWeaponRef.current.type !== 'DEFAULT' && time > activeWeaponRef.current.endTime) {
        activeWeaponRef.current = { type: 'DEFAULT', endTime: 0 };
    }

    powerUpsRef.current.forEach(p => {
        p.z -= 5 * dtSec; // Move towards player slowly
    });

    // Powerup collision
    powerUpsRef.current = powerUpsRef.current.filter(p => {
        const dx = p.x - playerXRef.current;
        const dz = p.z - (scrollZRef.current + GAME_CONFIG.PLAYER_Z + playerZOffsetRef.current);
        const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist < GAME_CONFIG.COLLISION_RADIUS_PLAYER + 1.5) {
            activeWeaponRef.current = { type: p.type, endTime: time + 10000 }; // 10 seconds
            audioService.playPowerUp();
            return false;
        }
        return p.z > scrollZRef.current - 10;
    });

    // 3. Player Shooting
    let currentFireRate = config.FIRE_RATE * SHIP_CONFIGS[selectedShipRef.current].fireRateMultiplier;
    if (activeWeaponRef.current.type === 'RAPID') {
        currentFireRate *= 0.3;
    }
    if (time - lastFireTimeRef.current > currentFireRate) {
        firePlayerShot(time);
    }

    // 3.5 Drone Logic
    dronesRef.current.forEach(drone => {
        // Smoothly follow player
        const targetX = playerXRef.current + drone.offsetX;
        const targetZ = scrollZRef.current + GAME_CONFIG.PLAYER_Z + playerZOffsetRef.current + drone.offsetZ;
        
        drone.x += (targetX - drone.x) * 0.1;
        drone.z += (targetZ - drone.z) * 0.1;

        // Drone Firing
        if (time - drone.lastFireTime > DRONE_CONFIG.FIRE_RATE) {
            projectilesRef.current.push({
                id: Math.random(),
                x: drone.x,
                z: drone.z + 1,
                vx: 0,
                vz: GAME_CONFIG.PROJECTILE_SPEED_PLAYER,
                isEnemy: false,
                damage: 20,
                scale: 0.6,
                color: '#fbbf24' // Amber
            });
            drone.lastFireTime = time;
        }
    });

    // 4. Update Enemies
    obstaclesRef.current.forEach(obs => {
        const enemyConfig = ENEMY_CONFIGS[obs.type];
        
        // Z Movement (Relative to scroll)
        // If SPEED_Z is 0, they move with scroll. If positive, they fly faster (downscreen).
        obs.z -= (enemyConfig.SPEED_Z * dtSec); 

        // X Movement (Patterns)
        if (obs.type === 'ENEMY_BASIC') {
            obs.x = obs.initialX + Math.sin((time + obs.timeOffset) * 0.002) * 1.5;
        } else if (obs.type === 'ENEMY_FAST') {
            obs.x = obs.initialX + Math.cos((time + obs.timeOffset) * 0.005) * 3;
        }

        // Firing
        const effectivePlayerZ = scrollZRef.current + GAME_CONFIG.PLAYER_Z + playerZOffsetRef.current;
        if (obs.z < scrollZRef.current + GAME_CONFIG.VISIBLE_Z_RANGE && obs.z > effectivePlayerZ + 5) {
             if (time > obs.lastFireTime + obs.fireRate) {
                 fireEnemyShot(obs, time);
             }
        }
    });

    // 5. Update Projectiles
    projectilesRef.current.forEach(proj => {
        proj.x += proj.vx * dtSec;
        proj.z += proj.vz * dtSec;
    });

    // 6. Cleanup (Out of bounds)
    // Keep enemies until they are well behind player
    obstaclesRef.current = obstaclesRef.current.filter(obs => obs.z > scrollZRef.current - 10);
    // Projectiles cleanup
    projectilesRef.current = projectilesRef.current.filter(proj => 
        proj.z < scrollZRef.current + GAME_CONFIG.VISIBLE_Z_RANGE + 10 && 
        proj.z > scrollZRef.current - 20 &&
        Math.abs(proj.x) < GAME_CONFIG.FIELD_WIDTH
    );

    // 7. Collision: Player Bullets vs Enemies
    projectilesRef.current.filter(p => !p.isEnemy).forEach(proj => {
        obstaclesRef.current.forEach(obs => {
            if (obs.health > 0) {
                const dx = Math.abs(proj.x - obs.x);
                const dz = Math.abs(proj.z - obs.z);
                
                // Simple box collision
                if (dx < obs.width/2 && dz < 1.0) {
                    obs.health -= (proj.damage || 25); 
                    proj.z = 99999; // Remove bullet
                    
                    if (obs.health <= 0) {
                        const scoreBase = ENEMY_CONFIGS[obs.type].SCORE;
                        scoreRef.current += scoreBase * (1 + (comboRef.current * 0.1));
                        comboRef.current += 1;
                        enemiesDestroyedRef.current++;
                        audioService.playExplosion();
                        
                        // Powerup drop (15% chance)
                        if (Math.random() < 0.15) {
                            const types: ('SPREAD' | 'RAPID' | 'BLASTER')[] = ['SPREAD', 'RAPID', 'BLASTER'];
                            powerUpsRef.current.push({
                                id: Math.random(),
                                x: obs.x,
                                z: obs.z,
                                type: types[Math.floor(Math.random() * types.length)]
                            });
                        }
                    }
                }
            }
        });
    });

    // 8. Collision: Player vs Enemy/Bullets
    const playerRadius = GAME_CONFIG.COLLISION_RADIUS_PLAYER;

    // Vs Enemies
    obstaclesRef.current = obstaclesRef.current.filter(obs => {
        if (obs.health <= 0) return false;
        
        // Relative Z check (Player is at fixed world Z, but enemies spawn way ahead)
        // Wait... in this logic, enemies Z decreases? No.
        // We need to normalize Z for collision. 
        // Let's assume standard Z coords. 
        // Player is at GAME_CONFIG.PLAYER_Z relative to SCREEN, but in world...
        // Actually, let's make Player move in World Z too?
        // NO. Top-down scrollers usually keep player static Z and move world.
        // BUT my rendering logic uses Z. 
        // Let's say Player is ALWAYS at `scrollZRef.current + GAME_CONFIG.PLAYER_Z + playerZOffsetRef.current`.
        
        const effectivePlayerZ = scrollZRef.current + GAME_CONFIG.PLAYER_Z + playerZOffsetRef.current;
        const dz = Math.abs(obs.z - effectivePlayerZ);
        const dx = Math.abs(obs.x - playerXRef.current);

        if (dz < 1.5 && dx < (obs.width/2 + playerRadius)) {
            takeDamage(1);
            return false; // Destroy enemy on impact
        }
        return true;
    });

    // Vs Enemy Bullets
    const effectivePlayerZ = scrollZRef.current + GAME_CONFIG.PLAYER_Z;
    projectilesRef.current.forEach(proj => {
        if (!proj.isEnemy) return;
        
        const dz = Math.abs(proj.z - effectivePlayerZ);
        const dx = Math.abs(proj.x - playerXRef.current);
        
        if (dz < 0.5 && dx < playerRadius * 0.6) {
            takeDamage(1);
            proj.z = -9999; // Hide bullet
        }
    });

    // 9. Update UI
    // State updates removed to prevent full re-renders on every frame.
    // HUD and Background now read directly from refs.

    if (gameStateRef.current === GameState.PLAYING) {
        reqRef.current = requestAnimationFrame(gameLoop);
    }
  };

  // --- CONTROLS ---
  const handlePointerDown = (clientX: number, clientY: number) => {
      isDraggingRef.current = true;
      lastPointerXRef.current = clientX;
      lastPointerYRef.current = clientY;
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
      if (!isDraggingRef.current || gameStateRef.current !== GameState.PLAYING) return;
      
      const deltaScreenX = clientX - lastPointerXRef.current;
      const deltaScreenY = clientY - lastPointerYRef.current;
      
      lastPointerXRef.current = clientX;
      lastPointerYRef.current = clientY;

      // Sensitivity tuning for mobile (higher sensitivity to feel responsive)
      const unitsPerPixel = (GAME_CONFIG.VISIBLE_Z_RANGE + 5) / window.innerHeight;
      
      const sensitivityX = unitsPerPixel * 1.5;
      const sensitivityY = unitsPerPixel * 1.5;
      
      let newX = targetPlayerXRef.current + (deltaScreenX * sensitivityX);
      const limitX = GAME_CONFIG.FIELD_WIDTH / 2;
      newX = Math.max(-limitX, Math.min(limitX, newX));
      targetPlayerXRef.current = newX;

      // Moving finger UP (negative delta Y) should move ship FORWARD (positive Z)
      let newZ = targetPlayerZOffsetRef.current - (deltaScreenY * sensitivityY);
      const limitZ = GAME_CONFIG.FIELD_DEPTH / 2;
      newZ = Math.max(-limitZ, Math.min(limitZ, newZ));
      targetPlayerZOffsetRef.current = newZ;
  };

  const handlePointerUp = () => {
      isDraggingRef.current = false;
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onUp = () => handlePointerUp();
    
    const onTouchMove = (e: TouchEvent) => handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd = () => handlePointerUp();

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = true;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = false;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = false;
    };

    if (gameState === GameState.PLAYING) {
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
    }
    return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
    };
  }, [gameState]);


  return (
    <div 
        className="relative w-full h-screen overflow-hidden bg-black font-mono select-none"
        onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
        onTouchStart={(e) => handlePointerDown(e.touches[0].clientX, e.touches[0].clientY)}
    >
      <div className={`absolute inset-0 ${isHitState ? 'animate-pulse bg-red-900/40' : ''}`}>
          <Background 
            scrollZRef={scrollZRef}
            playerXRef={playerXRef} 
            playerZOffsetRef={playerZOffsetRef}
            obstaclesRef={obstaclesRef}
            projectilesRef={projectilesRef}
            powerUpsRef={powerUpsRef}
            scoreRef={scoreRef}
            selectedShipRef={selectedShipRef}
            dronesRef={dronesRef}
          />
      </div>

      {gameState === GameState.PLAYING && (
        <>
            <HUD 
                speedRef={speedRef} 
                scoreRef={scoreRef} 
                healthRef={playerHealthRef}
                maxHealthRef={maxHealthRef}
                comboRef={comboRef}
                activeWeaponRef={activeWeaponRef}
                bombsRef={bombsRef}
            />
            
            {/* Bomb Button for Mobile */}
            <div className="absolute bottom-6 right-6 z-50 pointer-events-auto">
                <button 
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering drag
                        useBomb();
                    }}
                    className="w-16 h-16 rounded-full bg-red-600/80 border-2 border-red-400 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.6)] active:scale-95 transition-transform"
                >
                    <span className="text-white font-black text-xl">BOMB</span>
                </button>
            </div>

            <div className="absolute bottom-24 w-full text-center pointer-events-none">
                 <div className="w-16 h-16 mx-auto rounded-full border-2 border-cyan-500/30 flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                 </div>
                 <div className="text-cyan-500/50 text-xs mt-2 tracking-widest">DRAG TO PILOT</div>
            </div>
        </>
      )}

      {/* Main Menu / Game Over UI kept same as previous ... */}
      {gameState === GameState.IDLE && !showInstructions && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50 pointer-events-auto">
            {/* Top right controls */}
            <div className="absolute top-6 right-6 flex gap-4">
                <button onClick={() => setShowInstructions(true)} className="p-2 text-cyan-400 hover:text-cyan-300 border border-cyan-800 rounded bg-slate-900/50 transition-colors">
                    <Info size={24} />
                </button>
                <button onClick={toggleMute} className="p-2 text-cyan-400 hover:text-cyan-300 border border-cyan-800 rounded bg-slate-900/50 transition-colors">
                    {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>
            </div>

            <h1 className="text-6xl text-cyan-400 mb-2 text-shadow-retro italic uppercase">SKY BREAKER</h1>
            <p className="text-white/60 mb-8 tracking-widest text-lg">SECTOR 7 DEFENSE</p>
            
            {/* Ship Selection */}
            <div className="flex gap-4 mb-8">
                {Object.values(ShipType).map(type => {
                    const config = SHIP_CONFIGS[type];
                    const isSelected = selectedShip === type;
                    return (
                        <button 
                            key={type}
                            onClick={() => setSelectedShip(type)}
                            className={`p-4 border-2 rounded-lg flex flex-col items-center w-40 transition-all ${isSelected ? 'border-white bg-white/10 scale-105 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-slate-700 bg-black/50 hover:border-slate-500'}`}
                            style={{ borderColor: isSelected ? config.color : undefined }}
                        >
                            <div className="text-lg font-bold mb-2" style={{ color: config.color }}>{config.name}</div>
                            <div className="text-xs text-slate-400 text-center h-12 flex items-center">{config.description}</div>
                            <div className="mt-2 w-full text-[10px] text-slate-500 flex flex-col gap-1 font-mono">
                                <div className="flex justify-between"><span>HP:</span> <span className="text-white">{config.maxHealth}</span></div>
                                <div className="flex justify-between"><span>SPD:</span> <span className="text-white">{config.speedMultiplier}x</span></div>
                                <div className="flex justify-between"><span>FIRE:</span> <span className="text-white">{(1/config.fireRateMultiplier).toFixed(1)}x</span></div>
                            </div>
                        </button>
                    )
                })}
            </div>

            <div className="flex flex-col space-y-6 w-72">
                <div className="flex flex-col">
                    <button onClick={() => startGame(Difficulty.EASY)} className="menu-btn bg-emerald-600 border-cyan-300 text-white hover:bg-emerald-500">ROOKIE</button>
                    <span className="text-emerald-400/70 text-xs text-center mt-2 tracking-wider">Slower enemies, lower spawn rates. Good for beginners.</span>
                </div>
                <div className="flex flex-col">
                    <button onClick={() => startGame(Difficulty.MEDIUM)} className="menu-btn bg-cyan-600 border-cyan-300 text-white hover:bg-cyan-500">PILOT</button>
                    <span className="text-cyan-400/70 text-xs text-center mt-2 tracking-wider">Standard combat speed and density. The intended experience.</span>
                </div>
                <div className="flex flex-col">
                    <button onClick={() => startGame(Difficulty.HARD)} className="menu-btn bg-rose-600 border-cyan-300 text-white hover:bg-rose-500">ACE</button>
                    <span className="text-rose-400/70 text-xs text-center mt-2 tracking-wider">Fast, aggressive, bullet hell. For veterans only.</span>
                </div>
            </div>
            
             <style>{`
                .menu-btn { padding: 12px; font-size: 1.25rem; border: 2px solid; font-family: inherit; font-weight: bold; text-shadow: 1px 1px 0 #000; box-shadow: 0 0 15px rgba(6,182,212,0.3); }
            `}</style>
        </div>
      )}

      {gameState === GameState.IDLE && showInstructions && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-50 pointer-events-auto p-6">
              <div className="max-w-2xl w-full bg-slate-900 border-2 border-cyan-500/50 p-8 rounded-lg relative">
                  <button onClick={() => setShowInstructions(false)} className="absolute top-4 right-4 text-cyan-500 hover:text-cyan-300">
                      <X size={32} />
                  </button>
                  <h2 className="text-3xl text-cyan-400 mb-6 text-shadow-retro italic uppercase border-b border-cyan-500/30 pb-4">HOW TO PLAY</h2>
                  
                  <div className="space-y-4 text-cyan-100/80 text-sm md:text-base">
                      <p><strong className="text-yellow-400">CONTROLS:</strong> Drag anywhere on the screen to move your ship. The ship fires automatically.</p>
                      <p><strong className="text-red-400">BOMB:</strong> Tap the BOMB button (bottom right) to clear all enemy bullets and deal massive damage. You start with 3 bombs.</p>
                      <p><strong className="text-purple-400">POWER-UPS:</strong> Destroy enemies for a chance to drop power-ups (<span className="text-purple-400 font-bold">S</span>: Spread, <span className="text-yellow-400 font-bold">R</span>: Rapid, <span className="text-red-400 font-bold">B</span>: Blaster). They last 10 seconds.</p>
                      <p><strong className="text-emerald-400">COMBO SYSTEM:</strong> Destroy enemies in quick succession to build your combo multiplier and score massive points. Getting hit resets your combo.</p>
                      <p><strong className="text-blue-400">WEAPON LEVEL:</strong> Your base weapon upgrades automatically at 2000, 5000, and 10000 points.</p>
                  </div>
                  
                  <div className="mt-8 text-center">
                      <button onClick={() => setShowInstructions(false)} className="px-8 py-3 bg-cyan-600 text-white text-xl border border-cyan-400 hover:bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                          UNDERSTOOD
                      </button>
                  </div>
              </div>
          </div>
      )}

      {gameState === GameState.GAME_OVER && (
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50 p-6 text-center pointer-events-auto">
            <h2 className="text-6xl text-red-500 mb-6 text-shadow-retro animate-shake">MIA</h2>
            
            <div className="text-white text-2xl mb-2">SCORE: {Math.floor(finalStats?.score || 0)}</div>
            <div className="text-yellow-400 text-xl mb-6">COMBO: {finalStats?.finalCombo || 0}x</div>

            <div className="w-full max-w-md min-h-[80px] bg-slate-900/80 p-4 border border-cyan-500/30 mb-8 flex items-center justify-center">
                 {isLoadingFeedback ? (
                     <span className="text-cyan-400 animate-pulse">UPLOADING FLIGHT DATA...</span>
                 ) : (
                     <p className="text-cyan-200 text-lg italic">"{feedback}"</p>
                 )}
            </div>

            <div className="flex space-x-4">
                <button 
                    onClick={() => {
                        setGameState(GameState.IDLE);
                        gameStateRef.current = GameState.IDLE;
                    }}
                    className="px-8 py-3 bg-slate-800 text-white text-xl border border-slate-600 hover:bg-slate-700"
                >
                    MENU
                </button>
                <button 
                    onClick={() => startGame(difficultyRef.current)} 
                    className="px-8 py-3 bg-cyan-600 text-white text-xl border border-cyan-400 hover:bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                    SORTIE
                </button>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;