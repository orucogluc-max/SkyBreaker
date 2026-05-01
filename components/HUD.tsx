import React from 'react';
import { GAME_CONFIG } from '../constants';
import { ActiveWeapon } from '../types';

interface HUDProps {
  speedRef: React.MutableRefObject<number>;
  scoreRef: React.MutableRefObject<number>;
  healthRef: React.MutableRefObject<number>;
  maxHealthRef: React.MutableRefObject<number>;
  comboRef: React.MutableRefObject<number>;
  activeWeaponRef: React.MutableRefObject<ActiveWeapon>;
  bombsRef: React.MutableRefObject<number>;
}

const HUD: React.FC<HUDProps> = ({ speedRef, scoreRef, healthRef, maxHealthRef, comboRef, activeWeaponRef, bombsRef }) => {
  const [speed, setSpeed] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [health, setHealth] = React.useState(0);
  const [maxHealth, setMaxHealth] = React.useState(0);
  const [combo, setCombo] = React.useState(0);
  const [activeWeapon, setActiveWeapon] = React.useState<ActiveWeapon>({ type: 'DEFAULT', endTime: 0 });
  const [bombs, setBombs] = React.useState(0);

  React.useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;
    
    const updateHUD = (time: number) => {
      // Throttle HUD updates to ~30fps to save performance
      if (time - lastTime > 33) {
        setSpeed(speedRef.current);
        setScore(scoreRef.current);
        setHealth(healthRef.current);
        setMaxHealth(maxHealthRef.current);
        setCombo(comboRef.current);
        setActiveWeapon({ ...activeWeaponRef.current });
        setBombs(bombsRef.current);
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(updateHUD);
    };
    
    animationFrameId = requestAnimationFrame(updateHUD);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [speedRef, scoreRef, healthRef, comboRef]);

  return (
    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-10">
      
      {/* Left: Health & Speed */}
      <div className="flex flex-col gap-2">
        {/* Hearts */}
        <div className="flex space-x-1">
            {[...Array(maxHealth)].map((_, i) => (
                <div 
                    key={i} 
                    className={`w-8 h-8 ${i < health ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-red-900/30'} 
                    clip-heart transition-all duration-300 transform ${i < health ? 'scale-100' : 'scale-90'}`}
                />
            ))}
        </div>
        
        {/* Speed */}
        <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-4xl text-cyan-400 font-mono leading-none text-shadow-retro">
            {Math.floor(speed)}
            </span>
            <span className="text-xs text-cyan-200/60 font-bold">KM/H</span>
        </div>
      </div>

      {/* Center: Combo (Only show if > 1) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-4 flex flex-col items-center">
          <div className="text-cyan-400 text-xs tracking-widest uppercase mb-1">Weapon Lvl</div>
          <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4].map(lvl => (
                  <div 
                      key={lvl} 
                      className={`w-6 h-2 rounded-sm ${
                          score >= (lvl === 4 ? 10000 : lvl === 3 ? 5000 : lvl === 2 ? 2000 : 0) 
                          ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' 
                          : 'bg-cyan-900/30'
                      }`}
                  />
              ))}
          </div>
          {combo > 1 && (
              <div className="flex flex-col items-center animate-pulse">
                  <span className="text-6xl italic font-black text-yellow-400 tracking-tighter drop-shadow-lg transform -rotate-6">
                      {combo}x
                  </span>
                  <span className="text-yellow-200 text-xs tracking-[0.5em] uppercase">Combo</span>
              </div>
          )}
      </div>

      {/* Active PowerUp Indicator */}
      {activeWeapon.type !== 'DEFAULT' && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
              <div className={`text-xl font-black tracking-widest uppercase mb-2 ${
                  activeWeapon.type === 'SPREAD' ? 'text-purple-400' : 
                  activeWeapon.type === 'RAPID' ? 'text-yellow-400' : 'text-red-400'
              } animate-pulse`}>
                  {activeWeapon.type} MODE
              </div>
              <div className="w-48 h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
                  <div 
                      className={`h-full ${
                          activeWeapon.type === 'SPREAD' ? 'bg-purple-500' : 
                          activeWeapon.type === 'RAPID' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(0, (activeWeapon.endTime - performance.now()) / 10000 * 100)}%` }}
                  />
              </div>
          </div>
      )}

      {/* Right: Score & Bombs */}
      <div className="flex flex-col items-end">
        <div className="text-yellow-400 text-xs tracking-widest uppercase mb-1">Score</div>
        <div className="text-4xl text-white font-mono text-shadow-retro mb-4">
            {Math.floor(score).toString().padStart(6, '0')}
        </div>
        
        {/* Bombs Indicator */}
        <div className="flex space-x-1">
            {[...Array(3)].map((_, i) => (
                <div 
                    key={i} 
                    className={`w-4 h-4 rounded-full ${i < bombs ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-red-900/30'} transition-all`}
                />
            ))}
        </div>
        <div className="text-red-400 text-[10px] tracking-widest uppercase mt-1">Bombs</div>
      </div>

      <style>{`
        .clip-heart {
            clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
            /* Actually star shape for "Arcade" feel, but let's do a Heart polygon */
            clip-path: path('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
            transform: scale(1.2);
        }
      `}</style>
    </div>
  );
};

export default HUD;