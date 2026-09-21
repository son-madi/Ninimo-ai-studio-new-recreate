import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Palette, Sparkles } from 'lucide-react';
import { useTheme, Theme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'button' | 'segmented';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
  variant = 'button',
}) => {
  const { theme, cycleTheme, setTheme, isDark, isLight, isColourUI } = useTheme();
  const [showSparkle, setShowSparkle] = useState(false);

  const handleCycleTheme = () => {
    setShowSparkle(true);
    setTimeout(() => setShowSparkle(false), 600);
    cycleTheme();
  };

  const handleSetTheme = (newTheme: Theme) => {
    if (newTheme !== theme) {
      setShowSparkle(true);
      setTimeout(() => setShowSparkle(false), 600);
    }
    setTheme(newTheme);
  };

  if (variant === 'segmented') {
    const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
      { id: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
      { id: 'light', label: 'White', icon: <Sun className="w-3.5 h-3.5" /> },
      { id: 'classic-green', label: 'Colour', icon: <Palette className="w-3.5 h-3.5" /> },
    ];

    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl border transition-all ${
          isLight
            ? 'bg-slate-100 border-slate-200'
            : isColourUI
            ? 'bg-[#080e22] border-indigo-500/30'
            : 'bg-zinc-900 border-zinc-800'
        } ${className}`}
      >
        {themes.map((item) => {
          const active = theme === item.id;
          return (
            <motion.button
              key={item.id}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => handleSetTheme(item.id)}
              className={`relative px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                active
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                    : isColourUI
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/20'
                    : 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className={active ? (isColourUI ? 'text-white' : item.id === 'light' ? 'text-slate-900' : 'text-zinc-100') : ''}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    );
  }

  // Single Cycle Button
  const nextThemeLabel =
    theme === 'dark' ? 'White' : theme === 'light' ? 'Colour UI' : 'Dark';

  return (
    <motion.button
      id="theme-toggle-btn"
      type="button"
      onClick={handleCycleTheme}
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.9, rotate: 15 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`relative inline-flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 select-none ${
        isLight
          ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 hover:text-slate-950 shadow-sm'
          : isColourUI
          ? 'bg-[#0c1427] hover:bg-[#111c38] border-indigo-500/40 text-cyan-200 hover:text-white shadow-sm shadow-cyan-500/10'
          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white shadow-sm'
      } ${className}`}
      title={`Theme: ${theme === 'dark' ? 'Dark (Zinc)' : theme === 'light' ? 'White (Clean Light)' : 'Colour UI'}. Click to switch to ${nextThemeLabel} theme`}
      aria-label="Cycle between Dark, White, and Colour UI themes"
    >
      {/* Dynamic Sparkle Burst Ring on Click */}
      <AnimatePresence>
        {showSparkle && (
          <motion.span
            initial={{ scale: 0.4, opacity: 1 }}
            animate={{ scale: 1.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className={`absolute inset-0 rounded-xl border pointer-events-none ${
              isColourUI
                ? 'border-cyan-400 bg-cyan-400/20'
                : isLight
                ? 'border-amber-400 bg-amber-400/20'
                : 'border-zinc-400 bg-zinc-400/20'
            }`}
          />
        )}
      </AnimatePresence>

      <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
        <AnimatePresence mode="wait" initial={false}>
          {theme === 'dark' && (
            <motion.div
              key="moon"
              initial={{ rotate: -120, scale: 0.3, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 120, scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className="text-zinc-200"
            >
              <Moon className="w-4 h-4" />
            </motion.div>
          )}
          {theme === 'light' && (
            <motion.div
              key="sun"
              initial={{ rotate: 120, scale: 0.3, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -120, scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className="text-amber-500"
            >
              <Sun className="w-4 h-4" />
            </motion.div>
          )}
          {theme === 'classic-green' && (
            <motion.div
              key="palette"
              initial={{ rotate: -120, scale: 0.3, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 120, scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className="text-cyan-400"
            >
              <Palette className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showLabel && (
        <span className="text-xs font-bold select-none hidden sm:inline capitalize">
          {theme === 'classic-green' ? 'Colour' : theme}
        </span>
      )}
    </motion.button>
  );
};

