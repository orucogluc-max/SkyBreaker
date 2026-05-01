import React from 'react';

interface TimingBarProps {
  progress: number; // 0 to 100
  speed: number;
  config: {
    ZONE_GOOD_START: number;
    ZONE_PERFECT_START: number;
    ZONE_PERFECT_END: number;
  }
}

const TimingBar: React.FC<TimingBarProps> = ({ progress, speed, config }) => {
  // Zone calculations from props
  const goodStart = config.ZONE_GOOD_START;
  const goodWidth = config.ZONE_PERFECT_START - goodStart;
  
  const perfectStart = config.ZONE_PERFECT_START;
  const perfectWidth = config.ZONE_PERFECT_END - perfectStart;

  // Visual Styling for the track
  // We want a container at the bottom, looking like a slider
  
  return (
    <div className="relative w-full max-w-md h-12 bg-slate-800/80 rounded-full border-4 border-slate-600 backdrop-blur-sm overflow-hidden shadow-xl">
      
      {/* Track Background */}
      <div className="absolute inset-0 bg-slate-900"></div>

      {/* Good Zone (Yellow) */}
      <div 
        className="absolute top-0 bottom-0 bg-yellow-500/80"
        style={{ left: `${goodStart}%`, width: `${goodWidth}%` }}
      />
      
      {/* Perfect Zone (Green) */}
      <div 
        className="absolute top-0 bottom-0 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]"
        style={{ left: `${perfectStart}%`, width: `${perfectWidth}%` }}
      >
        <div className="w-full h-full flex items-center justify-center">
             <div className="w-1 h-full bg-white/30"></div>
        </div>
      </div>

      {/* The Moving Marker / Fill */}
      {/* In the reference image, it looks like a fill bar or a slider knob. 
          Let's do a fill bar that turns color when in zone, but visually looks like a progress bar. */}
      <div 
        className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-600 to-cyan-400 border-r-4 border-white transition-all duration-75 ease-linear"
        style={{ width: `${Math.min(progress, 100)}%` }}
      >
        {/* Glow effect at the tip */}
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/50 blur-sm"></div>
      </div>

      {/* Fail Zone Indicator (End of bar) */}
      <div className="absolute right-0 top-0 bottom-0 w-[5%] bg-red-500/30 border-l border-red-500/50"></div>
      
    </div>
  );
};

export default TimingBar;
