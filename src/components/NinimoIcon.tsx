import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NinimoIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
}

export const NinimoIcon: React.FC<NinimoIconProps> = ({ className = '', size = 'md', onClick }) => {
  const { isDark, isLight, isColourUI } = useTheme();
  const [clickCount, setClickCount] = useState(0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [wobble, setWobble] = useState(0);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  }[size];

  const handleIconClick = (e: React.MouseEvent) => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);
    setWobble((prev) => prev + 1);
    setShowHeartAnim(true);

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    if (nextCount >= 3) {
      setClickCount(0);
      setShowHeartAnim(false);
      // Trigger Rickroll easter egg
      try {
        window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank', 'noopener,noreferrer');
      } catch {
        window.location.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      }
    } else {
      resetTimerRef.current = setTimeout(() => {
        setClickCount(0);
        setShowHeartAnim(false);
      }, 2500);
    }

    if (onClick) {
      onClick();
    }
  };

  return (
    <motion.div
      key={wobble}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      animate={clickCount > 0 ? { rotate: [0, -12, 12, -8, 8, 0], scale: [1, 1.15, 1] } : {}}
      transition={{ duration: 0.3 }}
      onClick={handleIconClick}
      className={`relative ${sizeClasses} ${className} shrink-0 select-none cursor-pointer flex items-center justify-center`}
      title="Ninimo Bot (Triple-click for a surprise!)"
    >
      {/* Floating Love/Like Reaction on Click */}
      <AnimatePresence>
        {showHeartAnim && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.4 }}
            animate={{ opacity: 1, y: 18, scale: 1.2 }}
            exit={{ opacity: 0, y: 28, scale: 0.8 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute -bottom-1 pointer-events-none z-30 flex items-center gap-0.5"
          >
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
            <span className="text-[10px] font-black text-rose-400 drop-shadow-md">
              {clickCount}/3
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crisp Square Minecraft Bot Chassis */}
      <div
        className={`w-full h-full rounded-lg border transition-all duration-300 flex items-center justify-center p-1 shadow-sm ${
          isLight
            ? 'bg-white border-slate-300 text-slate-900 shadow-slate-200/60'
            : isColourUI
            ? 'bg-gradient-to-b from-[#0e1730] to-[#080d1e] border-cyan-500/40 text-cyan-300 shadow-cyan-500/15'
            : 'bg-[#141418] border-zinc-700/80 text-zinc-100 shadow-black/50'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Square Top Node / Antenna */}
          <line
            x1="12"
            y1="1.5"
            x2="12"
            y2="4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="square"
          />
          <rect
            x="10.8"
            y="0.8"
            width="2.4"
            height="2"
            rx="0.4"
            fill={isColourUI ? '#38bdf8' : isLight ? '#09090b' : '#ffffff'}
          />

          {/* Left Headset / Side Pod */}
          <rect
            x="1.8"
            y="8"
            width="2"
            height="7.5"
            rx="0.6"
            fill={isLight ? '#cbd5e1' : isColourUI ? '#1e293b' : '#27272a'}
            stroke="currentColor"
            strokeWidth="1.2"
          />

          {/* Right Headset / Side Pod */}
          <rect
            x="20.2"
            y="8"
            width="2"
            height="7.5"
            rx="0.6"
            fill={isLight ? '#cbd5e1' : isColourUI ? '#1e293b' : '#27272a'}
            stroke="currentColor"
            strokeWidth="1.2"
          />

          {/* Bold Square Bot Head (True Minecraft Block Aspect) */}
          <rect
            x="3.6"
            y="4"
            width="16.8"
            height="16"
            rx="2"
            fill={isLight ? '#f1f5f9' : isColourUI ? '#0f172a' : '#18181b'}
            stroke="currentColor"
            strokeWidth="1.8"
          />

          {/* Subtle Forehead Armor / Brow Notch */}
          <rect
            x="6.5"
            y="5.2"
            width="11"
            height="1.5"
            rx="0.4"
            fill={isLight ? '#e2e8f0' : isColourUI ? '#1e293b' : '#27272a'}
          />

          {/* Left Square Cyber Eye */}
          <rect
            x="6.8"
            y="8.8"
            width="3.8"
            height="3.4"
            rx="0.6"
            fill={isColourUI ? '#22d3ee' : isLight ? '#09090b' : '#ffffff'}
          />
          {/* Left Eye Glint */}
          <rect
            x="7.3"
            y="9.3"
            width="1.3"
            height="1.2"
            fill="#ffffff"
          />

          {/* Right Square Cyber Eye */}
          <rect
            x="13.4"
            y="8.8"
            width="3.8"
            height="3.4"
            rx="0.6"
            fill={isColourUI ? '#22d3ee' : isLight ? '#09090b' : '#ffffff'}
          />
          {/* Right Eye Glint */}
          <rect
            x="13.9"
            y="9.3"
            width="1.3"
            height="1.2"
            fill="#ffffff"
          />

          {/* Square Pixel Mouth / Grille */}
          <rect
            x="8.5"
            y="14.8"
            width="7"
            height="2"
            rx="0.4"
            fill={isLight ? '#94a3b8' : isColourUI ? '#334155' : '#3f3f46'}
          />
          {/* Grille Slots */}
          <line x1="10.8" y1="15" x2="10.8" y2="16.6" stroke={isLight ? '#f1f5f9' : isColourUI ? '#0f172a' : '#18181b'} strokeWidth="0.8" />
          <line x1="13.2" y1="15" x2="13.2" y2="16.6" stroke={isLight ? '#f1f5f9' : isColourUI ? '#0f172a' : '#18181b'} strokeWidth="0.8" />
        </svg>

        {/* Live Status Indicator Ping */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 pointer-events-none">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isColourUI ? 'bg-cyan-400' : isLight ? 'bg-slate-900' : 'bg-white'
          }`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ring-1 ${
            isColourUI
              ? 'bg-cyan-400 ring-slate-900'
              : isLight
              ? 'bg-slate-900 ring-white'
              : 'bg-white ring-zinc-950'
          }`} />
        </span>
      </div>
    </motion.div>
  );
};
