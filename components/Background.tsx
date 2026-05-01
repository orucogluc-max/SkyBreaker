import React, { useEffect, useRef } from 'react';
import { Obstacle, Projectile, PowerUp, ShipType, Drone } from '../types';
import { ENEMY_CONFIGS, GAME_CONFIG, SHIP_CONFIGS } from '../constants';

interface BackgroundProps {
  scrollZRef: React.MutableRefObject<number>;
  playerXRef: React.MutableRefObject<number>; 
  playerZOffsetRef: React.MutableRefObject<number>;
  obstaclesRef: React.MutableRefObject<Obstacle[]>;
  projectilesRef: React.MutableRefObject<Projectile[]>;
  powerUpsRef: React.MutableRefObject<PowerUp[]>;
  scoreRef: React.MutableRefObject<number>;
  selectedShipRef: React.MutableRefObject<ShipType>;
  dronesRef: React.MutableRefObject<Drone[]>;
}

const Background: React.FC<BackgroundProps> = ({ scrollZRef, playerXRef, playerZOffsetRef, obstaclesRef, projectilesRef, powerUpsRef, scoreRef, selectedShipRef, dronesRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Internal visual state
  const frameRef = useRef(0);
  const lastPlayerXRef = useRef(0);
  const currentBankRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      frameRef.current++;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      const scrollZ = scrollZRef.current;
      const playerX = playerXRef.current;
      const playerZOffset = playerZOffsetRef.current;
      const obstacles = obstaclesRef.current;
      const projectiles = projectilesRef.current;
      const powerUps = powerUpsRef.current;
      const score = scoreRef.current;

      // --- COORDINATE SYSTEM ---
      // World is Z-forward. Screen Y maps world Z.
      // Top of screen = scrollZ + VISIBLE_Z_RANGE
      // Bottom of screen = scrollZ - 5
      // Player is usually at scrollZ + PLAYER_Z
      const pixelsPerUnit = height / (GAME_CONFIG.VISIBLE_Z_RANGE + 5);
      
      const toScreen = (x: number, z: number) => {
          const relativeZ = z - scrollZ;
          // Z increases UP the screen in this game's data, so we invert for canvas Y
          // If Z = scrollZ (bottom), Y should be height
          // If Z = scrollZ + Range (top), Y should be 0
          
          // Actually, let's keep it simple: Player is at bottom 20%.
          // World Z moves forward. Objects with higher Z are ahead (up screen).
          
          // Fix camera on base Player Z (relative to scroll), ignoring player's local Z offset
          const baseWorldZ = scrollZ + GAME_CONFIG.PLAYER_Z;
          
          // Camera centers somewhat ahead of player
          const cameraZ = baseWorldZ + 10; 
          
          const screenX = centerX + (x * pixelsPerUnit);
          const screenY = centerY - ((z - cameraZ) * pixelsPerUnit);
          
          return { x: screenX, y: screenY, scale: pixelsPerUnit };
      };

      // --- 1. DRAW TECH JUNGLE BACKGROUND ---
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      
      // Dynamic background colors based on score
      if (score < 3000) {
          gradient.addColorStop(0, '#022c22'); // Teal 950
          gradient.addColorStop(1, '#0f172a'); // Slate 900
          ctx.strokeStyle = '#115e59'; // Teal 800
      } else if (score < 8000) {
          gradient.addColorStop(0, '#4a044e'); // Fuchsia 950
          gradient.addColorStop(1, '#1e1b4b'); // Indigo 950
          ctx.strokeStyle = '#701a75'; // Fuchsia 900
      } else {
          gradient.addColorStop(0, '#450a0a'); // Red 950
          gradient.addColorStop(1, '#000000'); // Black
          ctx.strokeStyle = '#7f1d1d'; // Red 900
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Scrolling Hex Grid
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const gridSpacing = 5 * pixelsPerUnit;
      const offset = (scrollZ * pixelsPerUnit) % gridSpacing;
      
      // Vertical Lines
      // for(let i=-5; i<=5; i++) {
      //    const x = centerX + i * gridSpacing;
      //    ctx.moveTo(x, 0);
      //    ctx.lineTo(x, height);
      // }
      // Horizontal Lines (scrolling)
      for(let y = -offset; y < height; y += gridSpacing) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
      }
      ctx.globalAlpha = 0.2;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Organic Veins (Reduced for performance)
      ctx.fillStyle = '#047857'; // Emerald 700
      const veinOffset = scrollZ * 0.5;
      for(let i=0; i<3; i++) {
          const y = ((i * 300) + veinOffset * pixelsPerUnit) % (height + 200) - 100;
          const x = (Math.sin(i + veinOffset * 0.1) * width/2) + width/2;
          const size = (Math.sin(i * 132) + 1.5) * 30;
          
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI*2);
          ctx.fill();
      }

      // --- 2. DRAW ENEMIES ---
      obstacles.forEach(obs => {
          const pos = toScreen(obs.x, obs.z);
          // Cull offscreen
          if (pos.y < -100 || pos.y > height + 100) return;

          const config = ENEMY_CONFIGS[obs.type];
          const size = obs.width * pixelsPerUnit * 0.6; // Scale sprite size

          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.rotate(Math.PI); // Enemies face down

          // --- MECH SPRITE GENERATION ---
          
          // Engine Trails
          ctx.fillStyle = '#f59e0b'; // Amber glow
          ctx.globalAlpha = 0.6;
          const flicker = Math.random() * 0.5 + 0.5;
          ctx.beginPath();
          ctx.moveTo(-size * 0.3, -size * 0.5);
          ctx.lineTo(0, -size * (1.5 + flicker));
          ctx.lineTo(size * 0.3, -size * 0.5);
          ctx.fill();
          ctx.globalAlpha = 1.0;

          // Body
          ctx.fillStyle = config.COLOR_BODY;
          ctx.strokeStyle = config.COLOR_ACCENT;
          ctx.lineWidth = 2;

          ctx.beginPath();
          if (obs.type === 'ENEMY_BASIC') {
            // Delta wing
            ctx.moveTo(0, size);
            ctx.lineTo(size * 0.8, -size * 0.5);
            ctx.lineTo(0, -size * 0.2);
            ctx.lineTo(-size * 0.8, -size * 0.5);
          } else if (obs.type === 'ENEMY_TANK') {
            // Bulk H shape
            ctx.moveTo(-size * 0.8, size);
            ctx.lineTo(-size * 0.5, -size);
            ctx.lineTo(size * 0.5, -size);
            ctx.lineTo(size * 0.8, size);
            ctx.lineTo(0, size * 0.5);
          } else if (obs.type === 'ENEMY_SCREAMER') {
              // Circle with spikes
              ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
          } else if (obs.type === 'ENEMY_BOSS') {
              // Massive Diamond/Star shape
              ctx.moveTo(0, size * 1.5);
              ctx.lineTo(size, 0);
              ctx.lineTo(0, -size * 1.5);
              ctx.lineTo(-size, 0);
          } else if (obs.type === 'ENEMY_STEALTH') {
              // Sleek V shape
              ctx.moveTo(0, size * 1.2);
              ctx.lineTo(size * 0.6, -size * 0.8);
              ctx.lineTo(0, -size * 0.4);
              ctx.lineTo(-size * 0.6, -size * 0.8);
          } else {
              // Fast needle
              ctx.moveTo(0, size * 1.2);
              ctx.lineTo(size * 0.3, -size);
              ctx.lineTo(-size * 0.3, -size);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Core Glow
          ctx.fillStyle = config.COLOR_ACCENT;
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Health Bar
          const hp = obs.health / obs.maxHealth;
          if (hp < 1) {
              ctx.fillStyle = 'red';
              ctx.fillRect(-size, -size * 1.2, size * 2, 4);
              ctx.fillStyle = '#00ff00';
              ctx.fillRect(-size, -size * 1.2, size * 2 * hp, 4);
          }

          ctx.restore();
      });

      // --- 3. DRAW PROJECTILES ---
      // Glow effect for bullets
      ctx.globalCompositeOperation = 'screen';
      projectiles.forEach(proj => {
          const pos = toScreen(proj.x, proj.z);
          if (pos.y < -50 || pos.y > height + 50) return;

          const size = pixelsPerUnit * 0.4 * (proj.scale || 1); 

          if (proj.isEnemy) {
              // Enemy Bullet (Orb)
              ctx.fillStyle = '#fca5a5';
              ctx.beginPath();
              ctx.arc(pos.x, pos.y, size * 0.5, 0, Math.PI*2);
              ctx.fill();
          } else {
              // Player Bullet (Long Beam)
              ctx.fillStyle = proj.color || '#cffafe';
              ctx.beginPath();
              ctx.moveTo(pos.x, pos.y - size);
              ctx.lineTo(pos.x + size*0.2, pos.y + size);
              ctx.lineTo(pos.x - size*0.2, pos.y + size);
              ctx.fill();
          }
      });
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';

      // --- 3.5 DRAW POWERUPS ---
      powerUps.forEach(p => {
          const pPos = toScreen(p.x, p.z);
          if (pPos.y < -50 || pPos.y > height + 50) return;
          
          const size = pixelsPerUnit * 0.8;
          
          ctx.save();
          ctx.translate(pPos.x, pPos.y);
          ctx.rotate(frameRef.current * 0.05); // Spin
          
          ctx.fillStyle = p.type === 'SPREAD' ? '#a855f7' : p.type === 'RAPID' ? '#facc15' : '#ef4444';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 15;
          
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size, 0);
          ctx.lineTo(0, size);
          ctx.lineTo(-size, 0);
          ctx.closePath();
          ctx.fill();
          
          ctx.fillStyle = '#fff';
          ctx.shadowBlur = 0;
          ctx.font = `bold ${size}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Un-rotate text
          ctx.rotate(-frameRef.current * 0.05);
          ctx.fillText(p.type.charAt(0), 0, 0);
          
          ctx.restore();
      });

      // --- 4. DRAW PLAYER ---
      const playerWorldZ = scrollZ + GAME_CONFIG.PLAYER_Z + playerZOffset;
      const pPos = toScreen(playerX, playerWorldZ);
      const pSize = pixelsPerUnit * 1.5; // Increased player size
      
      const shipType = selectedShipRef.current;
      const shipConfig = SHIP_CONFIGS[shipType];

      // Draw Drones
      dronesRef.current.forEach(drone => {
          const dPos = toScreen(drone.x, drone.z);
          const dSize = pixelsPerUnit * 0.6;
          
          ctx.save();
          ctx.translate(dPos.x, dPos.y);
          ctx.rotate(frameRef.current * 0.1);
          
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.moveTo(0, -dSize);
          ctx.lineTo(dSize, dSize);
          ctx.lineTo(-dSize, dSize);
          ctx.closePath();
          ctx.fill();
          
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(0, 0, dSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
      });

      ctx.save();
      ctx.translate(pPos.x, pPos.y);
      
      // Banking
      const playerVx = playerX - lastPlayerXRef.current;
      lastPlayerXRef.current = playerX;
      
      const targetBank = playerVx * -3.0; // Adjust multiplier for visual feel
      currentBankRef.current += (targetBank - currentBankRef.current) * 0.15;
      ctx.rotate(currentBankRef.current);

      // Player Engine
      ctx.fillStyle = shipConfig.color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(-pSize*0.3, pSize*0.5);
      ctx.lineTo(0, pSize*2);
      ctx.lineTo(pSize*0.3, pSize*0.5);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      if (shipType === ShipType.STRIKER) {
          // Player Ship (Hero Design)
          ctx.fillStyle = '#e2e8f0'; // Slate 200
          ctx.beginPath();
          ctx.moveTo(0, -pSize); // Nose
          ctx.lineTo(pSize * 0.8, pSize * 0.8); // Right Wing tip
          ctx.lineTo(0, pSize * 0.5); // Rear center
          ctx.lineTo(-pSize * 0.8, pSize * 0.8); // Left Wing tip
          ctx.closePath();
          ctx.fill();

          // Cockpit
          ctx.fillStyle = shipConfig.color;
          ctx.beginPath();
          ctx.moveTo(0, -pSize * 0.4);
          ctx.lineTo(pSize * 0.2, pSize * 0.2);
          ctx.lineTo(-pSize * 0.2, pSize * 0.2);
          ctx.fill();

          // Gun Mounts
          ctx.fillStyle = '#64748b';
          ctx.fillRect(-pSize * 0.6, 0, pSize * 0.2, pSize * 0.6);
          ctx.fillRect(pSize * 0.4, 0, pSize * 0.2, pSize * 0.6);
      } else if (shipType === ShipType.JUGGERNAUT) {
          // Bulky, wide design
          ctx.fillStyle = '#94a3b8'; // Slate 400
          ctx.beginPath();
          ctx.moveTo(0, -pSize * 0.8); // Nose
          ctx.lineTo(pSize * 1.2, pSize * 0.6); // Right Wing tip
          ctx.lineTo(pSize * 0.6, pSize * 0.8); // Right inner
          ctx.lineTo(0, pSize * 0.6); // Rear center
          ctx.lineTo(-pSize * 0.6, pSize * 0.8); // Left inner
          ctx.lineTo(-pSize * 1.2, pSize * 0.6); // Left Wing tip
          ctx.closePath();
          ctx.fill();

          // Cockpit
          ctx.fillStyle = shipConfig.color;
          ctx.beginPath();
          ctx.arc(0, 0, pSize * 0.3, 0, Math.PI * 2);
          ctx.fill();

          // Heavy Cannons
          ctx.fillStyle = '#334155';
          ctx.fillRect(-pSize * 1.0, -pSize * 0.2, pSize * 0.3, pSize * 1.0);
          ctx.fillRect(pSize * 0.7, -pSize * 0.2, pSize * 0.3, pSize * 1.0);
      } else if (shipType === ShipType.PHANTOM) {
          // Sleek, swept-back design
          ctx.fillStyle = '#cbd5e1'; // Slate 300
          ctx.beginPath();
          ctx.moveTo(0, -pSize * 1.2); // Long Nose
          ctx.lineTo(pSize * 0.5, pSize * 0.2); // Right mid
          ctx.lineTo(pSize * 0.9, pSize * 0.9); // Right Wing tip
          ctx.lineTo(0, pSize * 0.4); // Rear center
          ctx.lineTo(-pSize * 0.9, pSize * 0.9); // Left Wing tip
          ctx.lineTo(-pSize * 0.5, pSize * 0.2); // Left mid
          ctx.closePath();
          ctx.fill();

          // Cockpit
          ctx.fillStyle = shipConfig.color;
          ctx.beginPath();
          ctx.moveTo(0, -pSize * 0.6);
          ctx.lineTo(pSize * 0.15, pSize * 0.1);
          ctx.lineTo(-pSize * 0.15, pSize * 0.1);
          ctx.fill();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', handleResize);
    handleResize();

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [scrollZRef, playerXRef, obstaclesRef, projectilesRef]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
};

export default Background;