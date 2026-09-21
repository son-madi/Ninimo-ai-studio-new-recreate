import React from 'react';
import { Drumstick } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeartsAndHungerProps {
  health: number; // 0-20
  maxHealth?: number; // 20
  food: number; // 0-20
  saturation?: number;
  level?: number;
  expProgress?: number; // 0-1
}

export const HeartsAndHunger: React.FC<HeartsAndHungerProps> = ({
  health,
  maxHealth = 20,
  food,
  saturation = 0,
}) => {
  const { theme, isDark } = useTheme();

  // 10 hearts total, each heart = 2 HP
  const hearts = Array.from({ length: 10 }, (_, i) => {
    const heartVal = (i + 1) * 2;
    if (health >= heartVal) return 'full';
    if (health === heartVal - 1) return 'half';
    return 'empty';
  });

  // 10 hunger shanks total, each shank = 2 food
  const hunger = Array.from({ length: 10 }, (_, i) => {
    const shankVal = (i + 1) * 2;
    if (food >= shankVal) return 'full';
    if (food === shankVal - 1) return 'half';
    return 'empty';
  });

  return (
    <div id="minecraft-hud-bars" className={`space-y-3 border rounded-xl p-3.5 backdrop-blur-sm transition-colors ${
      isDark ? 'bg-zinc-900/80 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Health */}
        <div className="flex-1">
          <div className={`flex items-center justify-between text-xs font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            <span className="flex items-center gap-1.5 text-rose-500 font-semibold">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Health ({health}/{maxHealth})
            </span>
            <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {Math.round((health / maxHealth) * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            {hearts.map((state, i) => (
              <div
                key={`heart-${i}`}
                className="relative w-4 h-4 flex items-center justify-center transition-transform hover:scale-110"
                title={`Heart ${i + 1} (${state})`}
              >
                {state === 'full' && (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-red-500 stroke-red-700 stroke-1 drop-shadow-[0_0_4px_rgba(239,68,68,0.4)]">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                )}
                {state === 'half' && (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-red-700 stroke-1">
                    <defs>
                      <linearGradient id={`halfHeart-${i}`} x1="0" x2="1" y1="0" y2="0">
                        <stop offset="50%" stopColor="#ef4444" />
                        <stop offset="50%" stopColor="#27272a" />
                      </linearGradient>
                    </defs>
                    <path
                      fill={`url(#halfHeart-${i})`}
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    />
                  </svg>
                )}
                {state === 'empty' && (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-zinc-800 stroke-zinc-700 stroke-1">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Food / Hunger */}
        <div className="flex-1">
          <div className={`flex items-center justify-between text-xs font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            <span className="flex items-center gap-1.5 text-amber-500 font-semibold">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              Hunger ({food}/20)
            </span>
            <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Sat: {saturation}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {hunger.map((state, i) => (
              <div
                key={`shank-${i}`}
                className="relative w-4 h-4 flex items-center justify-center transition-transform hover:scale-110"
                title={`Hunger shank ${i + 1} (${state})`}
              >
                {state === 'full' && (
                  <Drumstick 
                    className="w-4 h-4 text-amber-600 fill-amber-500 drop-shadow-[0_0_3px_rgba(217,119,6,0.5)] rotate-[-25deg]"
                    strokeWidth={2}
                  />
                )}
                {state === 'half' && (
                  <Drumstick 
                    className="w-4 h-4 text-amber-700 fill-amber-600/50 opacity-85 rotate-[-25deg]"
                    strokeWidth={1.5}
                  />
                )}
                {state === 'empty' && (
                  <Drumstick 
                    className={`w-4 h-4 opacity-35 rotate-[-25deg] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}
                    strokeWidth={1.5}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
