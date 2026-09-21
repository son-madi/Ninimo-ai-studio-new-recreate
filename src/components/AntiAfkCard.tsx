import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  Clock,
  MoveHorizontal,
  CheckCircle2,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react';
import { AntiAfkConfig } from '../types';
import { useTheme } from '../context/ThemeContext';

interface AntiAfkCardProps {
  config: AntiAfkConfig;
  isOnline: boolean;
  botId: string;
  onUpdateConfig: (updated: AntiAfkConfig) => void;
  onTriggerTestMove: () => Promise<void>;
}

export const AntiAfkCard: React.FC<AntiAfkCardProps> = ({
  config,
  isOnline,
  onUpdateConfig,
  onTriggerTestMove,
}) => {
  const { theme, isDark, isColourUI } = useTheme();

  const [testing, setTesting] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  const handleToggle = () => {
    onUpdateConfig({ ...config, enabled: !config.enabled });
  };

  const handleIntervalPreset = (sec: number) => {
    onUpdateConfig({ ...config, intervalSeconds: sec });
  };

  const handleMovementTypeChange = (type: AntiAfkConfig['movementType']) => {
    onUpdateConfig({ ...config, movementType: type });
  };

  const handleTestClick = async () => {
    setTesting(true);
    setTestFeedback(config.movementType === 'safe_in_place' ? 'Testing safe in-place routine (arm swing, crouch, slot)...' : 'Executing Anti-AFK test routine...');
    try {
      await onTriggerTestMove();
      setTestFeedback('Routine executed successfully! Coordinates unchanged.');
      setTimeout(() => setTestFeedback(null), 4000);
    } catch {
      setTestFeedback('Test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div id="anti-afk-settings-card" className={`border rounded-2xl p-5 shadow-xl space-y-5 transition-colors ${
      isColourUI
        ? 'bg-[#0b1326] border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.12)]'
        : isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
    }`}>
      {/* Header with main toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm ${
            isColourUI
              ? 'bg-amber-950/60 border-amber-500/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-zinc-100 border-zinc-300 text-zinc-800'
          }`}>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${
              isColourUI ? 'text-amber-200' : isDark ? 'text-white' : 'text-zinc-900'
            }`}>
              Anti-AFK Movement System
              <span className={`text-[10px] border px-2.5 py-0.5 rounded-full font-mono font-bold ${
                isColourUI
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-xs'
                  : isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}>
                Active Routine
              </span>
            </h3>
            <p className={`text-xs ${isColourUI ? 'text-amber-300/70' : isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Moves bot left & right and returns to the exact same spot
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={handleToggle}
          className={`w-11 h-6 flex items-center rounded-full px-1 cursor-pointer transition-colors border shrink-0 ${
            config.enabled
              ? isColourUI
                ? 'bg-gradient-to-r from-amber-500 to-emerald-500 border-amber-400/80 shadow-[0_0_14px_rgba(245,158,11,0.4)]'
                : isDark ? 'bg-zinc-100 border-white shadow-sm' : 'bg-zinc-900 border-zinc-900 shadow-zinc-900/20'
              : isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-300 border-zinc-400'
          }`}
          title={config.enabled ? 'Click to pause Anti-AFK' : 'Click to enable Anti-AFK'}
        >
          <motion.div
            animate={{ x: config.enabled ? 20 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`w-4 h-4 rounded-full shadow-md ${
              config.enabled
                ? isColourUI ? 'bg-zinc-950 shadow-black/40' : isDark ? 'bg-zinc-950 shadow-black/40' : 'bg-white shadow-black/20'
                : isDark ? 'bg-zinc-400' : 'bg-white shadow-black/20'
            }`}
          />
        </motion.button>
      </div>

      {/* Settings Grid */}
      <div className="space-y-4">
        {/* Interval Selector */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <label className={`font-semibold flex items-center gap-1.5 ${
              isColourUI ? 'text-sky-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${isColourUI ? 'text-sky-400' : 'text-zinc-400'}`} />
              Execution Interval
            </label>
            <span className={`font-mono font-bold px-2.5 py-0.5 rounded-full border ${
              isColourUI
                ? 'text-amber-200 bg-amber-950/60 border-amber-500/60 shadow-xs'
                : isDark ? 'text-zinc-200 bg-zinc-800 border-zinc-700' : 'text-zinc-900 bg-zinc-100 border-zinc-300'
            }`}>
              Every {config.intervalSeconds} seconds
            </span>
          </div>

          {/* Quick preset buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[15, 30, 60, 120].map((sec) => (
              <motion.button
                key={sec}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => handleIntervalPreset(sec)}
                className={`py-1.5 rounded-full border text-xs font-semibold font-mono transition-all cursor-pointer ${
                  config.intervalSeconds === sec
                    ? isColourUI
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                      : isDark
                      ? 'bg-zinc-100 border-white text-zinc-950 font-bold shadow-sm'
                      : 'bg-zinc-900 border-zinc-900 text-white font-bold shadow-sm'
                    : isColourUI
                    ? 'bg-[#070d1a] border-slate-700 text-slate-300 hover:border-amber-500/60 hover:text-amber-300'
                    : isDark
                    ? 'bg-zinc-950/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                {sec}s
              </motion.button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="range"
              min="5"
              max="300"
              step="5"
              value={config.intervalSeconds}
              onChange={(e) => onUpdateConfig({ ...config, intervalSeconds: Number(e.target.value) })}
              className={`w-full h-1.5 rounded-lg cursor-pointer ${
                isColourUI ? 'accent-amber-400 bg-slate-800' : isDark ? 'accent-zinc-200 bg-zinc-800' : 'accent-zinc-900 bg-zinc-200'
              }`}
            />
          </div>
        </div>

        {/* Movement Style / Routine Type */}
        <div>
          <label className={`text-xs font-semibold flex items-center gap-1.5 mb-2 ${
            isColourUI ? 'text-cyan-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
          }`}>
            <MoveHorizontal className={`w-3.5 h-3.5 ${isColourUI ? 'text-cyan-400' : 'text-zinc-400'}`} />
            Movement Pattern
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => handleMovementTypeChange('safe_in_place')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                config.movementType === 'safe_in_place'
                  ? isColourUI
                    ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : isDark
                    ? 'bg-emerald-950/50 border-emerald-600 text-emerald-100 shadow-sm'
                    : 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                  : isColourUI
                  ? 'bg-[#070d1a] border-slate-700 text-slate-300 hover:border-emerald-500/60 hover:text-emerald-200'
                  : isDark
                  ? 'bg-zinc-950/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${config.movementType === 'safe_in_place' ? (isColourUI ? 'text-emerald-300' : isDark ? 'text-emerald-200' : 'text-emerald-800') : ''}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Safe In-Place (Anti-Cheat Safe)
                </span>
                {config.movementType === 'safe_in_place' && <CheckCircle2 className={`w-4 h-4 ${isColourUI ? 'text-emerald-400' : isDark ? 'text-emerald-300' : 'text-emerald-600'}`} />}
              </div>
              <p className={`text-[11px] mt-1 ${isColourUI ? 'text-slate-400' : config.movementType === 'safe_in_place' && !isDark ? 'text-emerald-700' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Zero XYZ packets. Rotates view, swings arm, crouches, and cycles hotbar. Never kicked for invalid movement!
              </p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => handleMovementTypeChange('strafe_lr')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                config.movementType === 'strafe_lr'
                  ? isColourUI
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : isDark
                    ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                  : isColourUI
                  ? 'bg-[#070d1a] border-slate-700 text-slate-300 hover:border-amber-500/60 hover:text-amber-200'
                  : isDark
                  ? 'bg-zinc-950/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span className={config.movementType === 'strafe_lr' ? (isColourUI ? 'text-amber-300' : isDark ? 'text-zinc-100' : 'text-white') : ''}>Left & Right Strafe</span>
                {config.movementType === 'strafe_lr' && <CheckCircle2 className={`w-4 h-4 ${isColourUI ? 'text-amber-400' : isDark ? 'text-zinc-200' : 'text-white'}`} />}
              </div>
              <p className={`text-[11px] mt-1 ${isColourUI ? 'text-slate-400' : config.movementType === 'strafe_lr' && !isDark ? 'text-zinc-300' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Strafes left for {config.strafeDurationMs}ms then right for {config.strafeDurationMs}ms. Never drifts.
              </p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => handleMovementTypeChange('full_routine')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                config.movementType === 'full_routine'
                  ? isColourUI
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : isDark
                    ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                  : isColourUI
                  ? 'bg-[#070d1a] border-slate-700 text-slate-300 hover:border-amber-500/60 hover:text-amber-200'
                  : isDark
                  ? 'bg-zinc-950/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span className={config.movementType === 'full_routine' ? (isColourUI ? 'text-amber-300' : isDark ? 'text-zinc-100' : 'text-white') : ''}>Full Anti-AFK Suite</span>
                {config.movementType === 'full_routine' && <CheckCircle2 className={`w-4 h-4 ${isColourUI ? 'text-amber-400' : isDark ? 'text-zinc-200' : 'text-white'}`} />}
              </div>
              <p className={`text-[11px] mt-1 ${isColourUI ? 'text-slate-400' : config.movementType === 'full_routine' && !isDark ? 'text-zinc-300' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Left/right strafe + look wobble + arm swing + sneak crouch.
              </p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => handleMovementTypeChange('rotate_look')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                config.movementType === 'rotate_look'
                  ? isColourUI
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : isDark
                    ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                  : isColourUI
                  ? 'bg-[#070d1a] border-slate-700 text-slate-300 hover:border-amber-500/60 hover:text-amber-200'
                  : isDark
                  ? 'bg-zinc-950/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span className={config.movementType === 'rotate_look' ? (isColourUI ? 'text-amber-300' : isDark ? 'text-zinc-100' : 'text-white') : ''}>Look Wobble Only</span>
                {config.movementType === 'rotate_look' && <CheckCircle2 className={`w-4 h-4 ${isColourUI ? 'text-amber-400' : isDark ? 'text-zinc-200' : 'text-white'}`} />}
              </div>
              <p className={`text-[11px] mt-1 ${isColourUI ? 'text-slate-400' : config.movementType === 'rotate_look' && !isDark ? 'text-zinc-300' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Gently adjusts pitch/yaw and resets. Best for tight standing spots.
              </p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => handleMovementTypeChange('jump_strafe')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                config.movementType === 'jump_strafe'
                  ? isColourUI
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : isDark
                    ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                  : isColourUI
                  ? 'bg-[#070d1a] border-slate-700 text-slate-300 hover:border-amber-500/60 hover:text-amber-200'
                  : isDark
                  ? 'bg-zinc-950/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span className={config.movementType === 'jump_strafe' ? (isColourUI ? 'text-amber-300' : isDark ? 'text-zinc-100' : 'text-white') : ''}>Jump & Strafe</span>
                {config.movementType === 'jump_strafe' && <CheckCircle2 className={`w-4 h-4 ${isColourUI ? 'text-amber-400' : isDark ? 'text-zinc-200' : 'text-white'}`} />}
              </div>
              <p className={`text-[11px] mt-1 ${isColourUI ? 'text-slate-400' : config.movementType === 'jump_strafe' && !isDark ? 'text-zinc-300' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Small hop with left/right micro-step to bypass AFK plugins.
              </p>
            </motion.button>
          </div>
        </div>

        {/* Micro Options */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <label className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer transition-colors ${
            isColourUI
              ? 'bg-[#070d1a] border-slate-700 hover:border-amber-500/60'
              : isDark ? 'bg-zinc-950/50 border-zinc-700 hover:bg-zinc-800/40' : 'bg-zinc-50 border-zinc-300 hover:bg-zinc-100'
          }`}>
            <input
              type="checkbox"
              checked={config.swingArm}
              onChange={(e) => onUpdateConfig({ ...config, swingArm: e.target.checked })}
              className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/40 cursor-pointer"
            />
            <span className={`text-xs font-semibold ${isColourUI ? 'text-amber-200' : isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Swing Arm</span>
          </label>

          <label className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer transition-colors ${
            isColourUI
              ? 'bg-[#070d1a] border-slate-700 hover:border-amber-500/60'
              : isDark ? 'bg-zinc-950/50 border-zinc-700 hover:bg-zinc-800/40' : 'bg-zinc-50 border-zinc-300 hover:bg-zinc-100'
          }`}>
            <input
              type="checkbox"
              checked={config.sneakWiggle}
              onChange={(e) => onUpdateConfig({ ...config, sneakWiggle: e.target.checked })}
              className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/40 cursor-pointer"
            />
            <span className={`text-xs font-semibold ${isColourUI ? 'text-amber-200' : isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Sneak Crouch</span>
          </label>
        </div>

        {/* Test Button & Feedback */}
        <div className={`pt-2 border-t ${
          isColourUI ? 'border-slate-800' : isDark ? 'border-zinc-800' : 'border-zinc-200'
        }`}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleTestClick}
            disabled={testing || !isOnline}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isOnline
                ? isColourUI
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 border border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                  : isDark
                  ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-white shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900 shadow-zinc-900/20'
                : isDark 
                  ? 'bg-zinc-800/30 text-zinc-600 border border-zinc-800/50 cursor-not-allowed'
                  : 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed'
            }`}
          >
            <PlayCircle className={`w-4 h-4 ${isColourUI ? 'text-zinc-950' : ''}`} />
            <span>{testing ? 'Performing Routine...' : 'Test Movement Routine Now'}</span>
          </motion.button>

          {testFeedback && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-center text-xs font-bold mt-2 ${
                isColourUI ? 'text-amber-300' : isDark ? 'text-zinc-200' : 'text-zinc-900'
              }`}
            >
              {testFeedback}
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
};
