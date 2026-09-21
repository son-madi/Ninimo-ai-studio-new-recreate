import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Compass,
  Copy,
  Check,
  ArrowRight,
  ArrowLeftRight,
  Sparkles,
  Info,
  Layers,
  AlertTriangle,
  Bot,
  MapPin,
  Flame,
} from 'lucide-react';
import { BotState } from '../types';
import { useTheme } from '../context/ThemeContext';

interface NetherPortalCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  activeBot?: BotState | null;
}

export const NetherPortalCalculator: React.FC<NetherPortalCalculatorProps> = ({
  isOpen,
  onClose,
  activeBot,
}) => {
  const { theme, isDark, isColourUI } = useTheme();

  const [direction, setDirection] = useState<'overworld_to_nether' | 'nether_to_overworld'>('overworld_to_nether');
  const [x, setX] = useState<number>(0);
  const [y, setY] = useState<number>(64);
  const [z, setZ] = useState<number>(0);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Second portal cross-link verification
  const [showLinkChecker, setShowLinkChecker] = useState(false);
  const [checkX, setCheckX] = useState<number>(0);
  const [checkY, setCheckY] = useState<number>(64);
  const [checkZ, setCheckZ] = useState<number>(0);

  // Auto-fill from active bot if available
  const handleUseBotCoords = () => {
    if (!activeBot) return;
    const posX = Math.round(activeBot.position.x);
    const posY = Math.round(activeBot.position.y);
    const posZ = Math.round(activeBot.position.z);

    setX(posX);
    setY(posY);
    setZ(posZ);

    if (activeBot.dimension === 'the_nether') {
      setDirection('nether_to_overworld');
    } else {
      setDirection('overworld_to_nether');
    }
  };

  const initializedRef = React.useRef(false);
  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      initializedRef.current = true;
      if (activeBot && (activeBot.position.x !== 0 || activeBot.position.z !== 0)) {
        setX(Math.round(activeBot.position.x));
        setY(Math.round(activeBot.position.y));
        setZ(Math.round(activeBot.position.z));
        if (activeBot.dimension === 'the_nether') {
          setDirection('nether_to_overworld');
        } else {
          setDirection('overworld_to_nether');
        }
      }
    } else if (!isOpen) {
      initializedRef.current = false;
    }
  }, [isOpen, activeBot?.id]);

  if (!isOpen) return null;

  // Calculation Math
  const isOverworldToNether = direction === 'overworld_to_nether';
  const targetX = isOverworldToNether ? Math.floor(x / 8) : x * 8;
  const targetZ = isOverworldToNether ? Math.floor(z / 8) : z * 8;
  const targetY = y; // Y coordinate is 1:1 in vanilla Minecraft

  // Distance calculation for Link Checker
  const dx = targetX - checkX;
  const dy = targetY - checkY;
  const dz = targetZ - checkZ;
  const distance3D = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const maxSearchRadius = isOverworldToNether ? 128 : 1024;
  const isWithinLinkingDistance = distance3D <= maxSearchRadius;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 overflow-y-auto">
      <motion.div
        id="nether-portal-modal"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className={`border rounded-3xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto shadow-2xl flex flex-col relative my-auto transform-gpu will-change-transform ${
          isColourUI
            ? 'bg-gradient-to-b from-[#18092d] via-[#10031f] to-[#0a0214] border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.35)] text-purple-100'
            : isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between relative z-10 ${
          isColourUI
            ? 'border-purple-500/30 bg-[#1e0a38]/90 text-white'
            : isDark ? 'border-zinc-800 bg-zinc-950/90' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
              isColourUI
                ? 'bg-purple-500/25 border-purple-400/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-zinc-200 border-zinc-300 text-zinc-800'
            }`}>
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-extrabold text-base tracking-tight flex items-center gap-2 ${
                isColourUI
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-fuchsia-200 to-pink-200'
                  : isDark ? 'text-white' : 'text-zinc-950'
              }`}>
                Nether Portal Link Calculator
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isColourUI
                    ? 'bg-purple-500/25 text-purple-200 border-purple-400/50 shadow-xs'
                    : isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                }`}>
                  1:8 Ratio
                </span>
              </h3>
              <p className={`text-xs ${isColourUI ? 'text-purple-300/80' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Calculate exact portal coordinate pairs & prevent accidental cross-linking
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isColourUI
                ? 'text-purple-300 hover:text-white hover:bg-purple-900/50'
                : isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="p-6 space-y-6 relative z-10 text-xs">
          {/* Active Bot Quick Sync Action */}
          {activeBot && (
            <div className={`border rounded-2xl p-3 flex items-center justify-between gap-3 ${
              isColourUI
                ? 'bg-[#240c42]/80 border-purple-500/40 shadow-xs'
                : isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <Bot className={`w-4 h-4 shrink-0 ${isColourUI ? 'text-purple-400' : isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
                <span className={`text-xs truncate ${isColourUI ? 'text-purple-200' : isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Active Bot: <strong className={`font-mono ${isColourUI ? 'text-white' : isDark ? 'text-white' : 'text-zinc-950'}`}>{activeBot.config.username}</strong> at{' '}
                  <span className={`font-mono font-bold ${isColourUI ? 'text-fuchsia-300' : isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {Math.round(activeBot.position.x)}, {Math.round(activeBot.position.y)}, {Math.round(activeBot.position.z)}
                  </span>{' '}
                  ({activeBot.dimension === 'the_nether' ? 'Nether' : 'Overworld'})
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUseBotCoords}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shadow-xs cursor-pointer shrink-0 text-xs flex items-center gap-1.5 border ${
                  isColourUI
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border-purple-400/50 shadow-lg shadow-purple-600/30'
                    : isDark
                    ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-white'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Use Bot Coords</span>
              </motion.button>
            </div>
          )}

          {/* Direction Switcher Pill */}
          <div className={`grid grid-cols-2 p-1.5 border rounded-2xl relative ${
            isColourUI
              ? 'bg-[#150424] border-purple-500/40'
              : isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
          }`}>
            <button
              type="button"
              onClick={() => setDirection('overworld_to_nether')}
              className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-colors relative z-10 flex items-center justify-center gap-2 cursor-pointer ${
                isOverworldToNether
                  ? 'text-white'
                  : isColourUI ? 'text-purple-300/70 hover:text-purple-100' : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isColourUI ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : isDark ? 'bg-zinc-300' : 'bg-zinc-800'}`} />
              <span>Overworld &rarr; Nether (÷8)</span>
              {isOverworldToNether && (
                <motion.div
                  layoutId="portal-direction-pill"
                  className={`absolute inset-0 rounded-xl -z-10 shadow-xs border ${
                    isColourUI
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400/50 shadow-md shadow-emerald-500/30'
                      : isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-300'
                  }`}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setDirection('nether_to_overworld')}
              className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-colors relative z-10 flex items-center justify-center gap-2 cursor-pointer ${
                !isOverworldToNether
                  ? 'text-white'
                  : isColourUI ? 'text-purple-300/70 hover:text-purple-100' : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Nether &rarr; Overworld (&times;8)</span>
              {!isOverworldToNether && (
                <motion.div
                  layoutId="portal-direction-pill"
                  className={`absolute inset-0 rounded-xl -z-10 shadow-xs border ${
                    isColourUI
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 border-purple-400/50 shadow-md shadow-purple-600/30'
                      : isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-300'
                  }`}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                />
              )}
            </button>
          </div>

          {/* Input Coordinates Grid */}
          <div className={`border rounded-2xl p-4 space-y-3 ${
            isColourUI
              ? 'bg-[#1c0835]/90 border-purple-500/40 shadow-xs'
              : isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                isColourUI ? 'text-purple-200' : isDark ? 'text-zinc-200' : 'text-zinc-800'
              }`}>
                <Compass className={`w-4 h-4 ${isColourUI ? 'text-purple-400' : 'text-zinc-400'}`} />
                Source Coordinates ({isOverworldToNether ? 'Overworld' : 'Nether'})
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => { setX(0); setY(64); setZ(0); }}
                  className={`font-semibold cursor-pointer underline ${
                    isColourUI ? 'text-purple-300 hover:text-white' : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Reset (0, 64, 0)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* X Input */}
              <div className="space-y-1">
                <span className={`block text-[11px] font-bold font-mono ${
                  isColourUI ? 'text-purple-300' : isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}>X Axis</span>
                <input
                  type="number"
                  value={x}
                  onChange={(e) => setX(parseInt(e.target.value, 10) || 0)}
                  className={`w-full border rounded-xl px-3 py-2 font-mono text-sm font-bold focus:outline-none transition-all ${
                    isColourUI
                      ? 'bg-[#0f031c] border-purple-500/50 text-purple-100 placeholder-purple-400/40 focus:border-purple-300 focus:ring-2 focus:ring-purple-500/30'
                      : isDark ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                  }`}
                />
              </div>

              {/* Y Input */}
              <div className="space-y-1">
                <span className={`block text-[11px] font-bold font-mono ${
                  isColourUI ? 'text-purple-300' : isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}>Y Height</span>
                <input
                  type="number"
                  value={y}
                  onChange={(e) => setY(parseInt(e.target.value, 10) || 0)}
                  className={`w-full border rounded-xl px-3 py-2 font-mono text-sm font-bold focus:outline-none transition-all ${
                    isColourUI
                      ? 'bg-[#0f031c] border-purple-500/50 text-purple-100 placeholder-purple-400/40 focus:border-purple-300 focus:ring-2 focus:ring-purple-500/30'
                      : isDark ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                  }`}
                />
              </div>

              {/* Z Input */}
              <div className="space-y-1">
                <span className={`block text-[11px] font-bold font-mono ${
                  isColourUI ? 'text-purple-300' : isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}>Z Axis</span>
                <input
                  type="number"
                  value={z}
                  onChange={(e) => setZ(parseInt(e.target.value, 10) || 0)}
                  className={`w-full border rounded-xl px-3 py-2 font-mono text-sm font-bold focus:outline-none transition-all ${
                    isColourUI
                      ? 'bg-[#0f031c] border-purple-500/50 text-purple-100 placeholder-purple-400/40 focus:border-purple-300 focus:ring-2 focus:ring-purple-500/30'
                      : isDark ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                  }`}
                />
              </div>
            </div>

            {/* Quick Height Presets */}
            <div className="pt-2 flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold ${isColourUI ? 'text-purple-300' : isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>Height Presets:</span>
              <button
                type="button"
                onClick={() => setY(115)}
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono cursor-pointer transition-colors ${
                  isColourUI
                    ? 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border-purple-500/40 shadow-xs'
                    : isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                }`}
              >
                Nether Highway (Y=115)
              </button>
              <button
                type="button"
                onClick={() => setY(128)}
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono cursor-pointer transition-colors ${
                  isColourUI
                    ? 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border-purple-500/40 shadow-xs'
                    : isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                }`}
              >
                Bedrock Roof (Y=128)
              </button>
              <button
                type="button"
                onClick={() => setY(64)}
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono cursor-pointer transition-colors ${
                  isColourUI
                    ? 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border-purple-500/40 shadow-xs'
                    : isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                }`}
              >
                Sea Level (Y=64)
              </button>
              <button
                type="button"
                onClick={() => setY(32)}
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono cursor-pointer transition-colors ${
                  isColourUI
                    ? 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border-purple-500/40 shadow-xs'
                    : isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                }`}
              >
                Nether Lava Sea (Y=32)
              </button>
            </div>
          </div>

          {/* Results Display Card */}
          <div className={`border rounded-3xl p-5 shadow-sm relative overflow-hidden transition-all duration-300 ${
            isColourUI
              ? 'bg-gradient-to-br from-[#2c0e52] via-[#1a0533] to-[#120224] border-purple-400/60 shadow-[0_0_40px_rgba(168,85,247,0.35)] text-white'
              : isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-100 border-zinc-300 text-zinc-900'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isColourUI ? 'text-purple-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  <Sparkles className={`w-3.5 h-3.5 ${isColourUI ? 'text-fuchsia-300' : 'text-zinc-400'}`} />
                  Target Portal Coordinates in {isOverworldToNether ? 'The Nether' : 'The Overworld'}
                </span>
                <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight mt-1 flex items-baseline gap-2 ${
                  isColourUI
                    ? 'text-white drop-shadow-[0_0_12px_rgba(192,132,252,0.6)]'
                    : isDark ? 'text-white' : 'text-zinc-950'
                }`}>
                  <span className={isColourUI ? 'text-purple-100' : ''}>X: {targetX}</span>
                  <span className={isColourUI ? 'text-fuchsia-300' : isDark ? 'text-zinc-400' : 'text-zinc-600'}>Y: {targetY}</span>
                  <span className={isColourUI ? 'text-purple-100' : ''}>Z: {targetZ}</span>
                </div>
                <p className={`text-xs mt-1 ${isColourUI ? 'text-purple-200/80' : isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Build your receiving portal frame exactly at this location for flawless 1:1 synchronization.
                </p>
              </div>

              {/* Action Copy Buttons */}
              <div className="flex flex-col gap-2 shrink-0">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => copyToClipboard(`${targetX} ${targetY} ${targetZ}`, 'coords')}
                  className={`px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer border ${
                    isColourUI
                      ? 'bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white border-purple-300/60 shadow-lg shadow-purple-500/40'
                      : isDark
                      ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-white'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900'
                  }`}
                >
                  {copiedType === 'coords' ? (
                    <>
                      <Check className={`w-4 h-4 ${isColourUI ? 'text-emerald-300' : isDark ? 'text-zinc-900' : 'text-zinc-100'}`} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Coords</span>
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => copyToClipboard(`/tp @s ${targetX} ${targetY} ${targetZ}`, 'tp')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-[11px] flex items-center justify-center gap-1.5 transition-colors border cursor-pointer ${
                    isColourUI
                      ? 'bg-[#18042c] hover:bg-[#260744] text-purple-200 border-purple-500/50 hover:border-purple-400'
                      : isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                      : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300'
                  }`}
                >
                  {copiedType === 'tp' ? (
                    <Check className={`w-3.5 h-3.5 ${isColourUI ? 'text-emerald-400' : isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
                  ) : (
                    <Copy className={`w-3.5 h-3.5 ${isColourUI ? 'text-purple-400' : 'text-zinc-400'}`} />
                  )}
                  <span>Copy /tp Command</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Linking Distance & Accidental Cross-Link Checker */}
          <div className={`border rounded-2xl overflow-hidden ${
            isColourUI
              ? 'border-purple-500/40 bg-[#150428]'
              : isDark ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-zinc-50'
          }`}>
            <button
              type="button"
              onClick={() => setShowLinkChecker(!showLinkChecker)}
              className={`w-full px-4 py-3 flex items-center justify-between transition-colors cursor-pointer text-xs font-bold ${
                isColourUI
                  ? 'text-purple-200 hover:text-white'
                  : isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-700 hover:text-zinc-950'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className={`w-4 h-4 ${isColourUI ? 'text-purple-400' : 'text-zinc-400'}`} />
                <span>Portal Cross-Link Conflict Checker</span>
                <span className={`text-[10px] font-normal ${isColourUI ? 'text-purple-400/80' : isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  (Check if another portal will steal the link)
                </span>
              </div>
              <span className={`font-mono font-bold text-xs ${isColourUI ? 'text-fuchsia-300' : isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>
                {showLinkChecker ? 'Hide Checker' : 'Test Coords'}
              </span>
            </button>

            <AnimatePresence>
              {showLinkChecker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`px-4 pb-4 border-t pt-3 space-y-3 ${
                    isColourUI ? 'border-purple-500/30' : isDark ? 'border-zinc-800' : 'border-zinc-200'
                  }`}
                >
                  <p className={`text-xs ${isColourUI ? 'text-purple-300/90' : isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    In Minecraft, portals search within <strong className={isColourUI ? 'text-white' : isDark ? 'text-white' : 'text-zinc-950'}>128 blocks</strong> in the Nether and <strong className={isColourUI ? 'text-white' : isDark ? 'text-white' : 'text-zinc-950'}>1,024 blocks</strong> in the Overworld. Enter a neighboring portal’s coordinates to check if it interferes:
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Neighbor X"
                      value={checkX}
                      onChange={(e) => setCheckX(parseInt(e.target.value, 10) || 0)}
                      className={`border rounded-xl px-2.5 py-1.5 font-mono text-xs focus:outline-none ${
                        isColourUI
                          ? 'bg-[#0f031c] border-purple-500/50 text-purple-100 placeholder-purple-400/50 focus:border-purple-300'
                          : isDark ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                      }`}
                    />
                    <input
                      type="number"
                      placeholder="Neighbor Y"
                      value={checkY}
                      onChange={(e) => setCheckY(parseInt(e.target.value, 10) || 0)}
                      className={`border rounded-xl px-2.5 py-1.5 font-mono text-xs focus:outline-none ${
                        isColourUI
                          ? 'bg-[#0f031c] border-purple-500/50 text-purple-100 placeholder-purple-400/50 focus:border-purple-300'
                          : isDark ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                      }`}
                    />
                    <input
                      type="number"
                      placeholder="Neighbor Z"
                      value={checkZ}
                      onChange={(e) => setCheckZ(parseInt(e.target.value, 10) || 0)}
                      className={`border rounded-xl px-2.5 py-1.5 font-mono text-xs focus:outline-none ${
                        isColourUI
                          ? 'bg-[#0f031c] border-purple-500/50 text-purple-100 placeholder-purple-400/50 focus:border-purple-300'
                          : isDark ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                      }`}
                    />
                  </div>

                  <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                    isWithinLinkingDistance
                      ? isColourUI ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                      : isColourUI ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                  }`}>
                    <div className="flex items-center gap-2">
                      {isWithinLinkingDistance ? (
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      ) : (
                        <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                      )}
                      <span>
                        Distance: <strong className="font-mono">{Math.round(distance3D)} blocks</strong>.{' '}
                        {isWithinLinkingDistance
                          ? `Warning: Within search radius (<=${maxSearchRadius}b). Portals may cross-link if built too close.`
                          : `Safe: Outside linking range (>${maxSearchRadius}b). No cross-linking conflicts.`}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Pro Tips */}
          <div className={`p-3.5 border rounded-2xl flex items-start gap-2.5 ${
            isColourUI
              ? 'bg-[#1d0838]/80 border-purple-500/40 text-purple-200'
              : isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
          }`}>
            <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isColourUI ? 'text-purple-400' : 'text-zinc-400'}`} />
            <div className="text-[11px] leading-relaxed space-y-1">
              <p>
                <strong className={isColourUI ? 'text-white' : isDark ? 'text-zinc-200' : 'text-zinc-800'}>How 2-Way Linking Works:</strong> Always ignite both portals manually at their respective calculated coordinates. If you walk through a newly generated portal before building the pair, Minecraft may offset the portal to the nearest safe ground cavern.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

