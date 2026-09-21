import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Square,
  RotateCw,
  Edit3,
  Trash2,
  Clock,
  Zap,
  RotateCcw,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import { BotState } from '../types';
import { HeartsAndHunger } from './HeartsAndHunger';
import { useTheme } from '../context/ThemeContext';

interface BotHudProps {
  bot: BotState;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onEdit: (bot: BotState) => void;
  onDelete: (id: string) => void;
  onToggleAntiAfk: (id: string, enabled: boolean) => void;
  onToggleAutoReconnect?: (id: string, autoReconnect: boolean) => void;
  onOpenNetherCalc?: () => void;
  isAdmin?: boolean;
}

export const BotHud: React.FC<BotHudProps> = ({
  bot,
  onStart,
  onStop,
  onRestart,
  onEdit,
  onDelete,
  onToggleAntiAfk,
  onToggleAutoReconnect,
  onOpenNetherCalc,
}) => {
  const { theme, isDark, isColourUI } = useTheme();
  const [avatarError, setAvatarError] = useState(false);

  const avatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(bot.config.username)}/96`;

  const formatUptime = (sec: number) => {
    if (!sec || sec <= 0) return '00:00';
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');

    if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  const statusConfig = {
    online: {
      color: isColourUI
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
        : isDark
        ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
        : 'bg-black text-white border-black font-extrabold',
      dot: isColourUI
        ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse'
        : isDark ? 'bg-zinc-100 animate-pulse' : 'bg-white animate-pulse',
      label: 'CONNECTED',
    },
    starting: {
      color: isColourUI
        ? 'bg-sky-500/20 text-sky-200 border-sky-400/60 shadow-[0_0_15px_rgba(14,165,233,0.25)]'
        : isDark ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' : 'bg-black text-white border-black font-extrabold',
      dot: 'bg-white animate-spin',
      label: 'CONNECTING...',
    },
    reconnecting: {
      color: isColourUI
        ? 'bg-amber-500/20 text-amber-200 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
        : isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-zinc-800 text-white border-zinc-800 font-extrabold',
      dot: 'bg-white animate-pulse',
      label: bot.nextReconnectIn ? `REJOINING IN ${bot.nextReconnectIn}s` : 'RECONNECTING',
    },
    stopped: {
      color: isColourUI
        ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
        : isDark ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-zinc-100 text-zinc-700 border-zinc-300 font-bold',
      dot: 'bg-zinc-500',
      label: 'STOPPED',
    },
    kicked: {
      color: isDark ? 'bg-orange-500/15 text-orange-300 border-orange-500/30' : 'bg-black text-white border-black font-extrabold',
      dot: 'bg-white animate-ping',
      label: 'KICKED',
    },
    error: {
      color: isDark ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-black text-white border-black font-extrabold',
      dot: 'bg-white',
      label: 'ERROR',
    },
  };

  const curStatus = statusConfig[bot.status] || statusConfig.stopped;

  return (
    <div
      id="bot-hud-main"
      className={`border rounded-2xl p-5 shadow-xl space-y-5 transition-all duration-300 ${
        isColourUI
          ? 'bg-zinc-900/95 border-sky-500/30 shadow-[0_4px_30px_rgba(14,165,233,0.08)]'
          : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-200/50'
      }`}
    >
      {/* Top Bar: Skin Head, IGN, Server IP, Status Pill, Action Buttons */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 ${
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      }`}>
        <div className="flex items-center gap-4">
          {/* Minecraft Skin Head */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="relative shrink-0"
          >
            <div className={`w-16 h-16 rounded-2xl border p-1 flex items-center justify-center shadow-lg relative ${
              isDark ? 'bg-zinc-950 border-zinc-700' : 'bg-zinc-100 border-zinc-300'
            }`}>
              <div className="w-full h-full rounded-xl overflow-hidden flex items-center justify-center">
                {!avatarError ? (
                  <img
                    src={avatarUrl}
                    alt={bot.config.username}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover pixelated rounded-xl"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center font-black text-zinc-200 text-xl">
                    {bot.config.username.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Status indicator dot */}
              <span
                className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 ${
                  isDark ? 'border-zinc-900' : 'border-white'
                } z-10 shadow-sm ${curStatus.dot}`}
              />
            </div>
          </motion.div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`text-xl font-extrabold tracking-tight ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                {bot.config.username}
              </h2>
              {bot.config.name && bot.config.name !== bot.config.username && (
                <span className={`text-xs px-2.5 py-0.5 rounded-lg font-medium border ${
                  isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                }`}>
                  {bot.config.name}
                </span>
              )}
            </div>

            <div className={`flex items-center gap-2 mt-1 text-xs flex-wrap ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}>
              <span className={`font-mono font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>
                {bot.config.host}:{bot.config.port}
              </span>
              <span>&bull;</span>
              <span className="capitalize font-medium">
                {bot.config.auth === 'offline' ? 'Cracked' : 'Premium'}
              </span>
              {bot.config.version ? (
                <>
                  <span>&bull;</span>
                  <span>v{bot.config.version}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Status Pill & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${curStatus.color}`}
          >
            <span className={`w-2 h-2 rounded-full ${curStatus.dot}`} />
            <span>{curStatus.label}</span>
          </div>

          <div className={`flex items-center gap-1.5 border p-1.5 rounded-2xl ${
            isColourUI
              ? 'bg-[#060b16] border-[#1c2b48]'
              : isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
          }`}>
            {bot.status === 'online' || bot.status === 'starting' || bot.status === 'reconnecting' ? (
              <motion.button
                id="btn-stop-bot"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                onClick={() => onStop(bot.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="Stop Bot"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </motion.button>
            ) : (
              <motion.button
                id="btn-start-bot"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                onClick={() => onStart(bot.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer border ${
                  isColourUI
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 border-emerald-300/60 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : isDark
                    ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-white shadow-zinc-950/40'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900 shadow-zinc-900/20'
                }`}
                title="Connect & Run 24/7"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start</span>
              </motion.button>
            )}

            <motion.button
              id="btn-restart-bot"
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 350, damping: 18 }}
              onClick={() => onRestart(bot.id)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isColourUI
                  ? 'text-cyan-400 border-cyan-500/30 hover:text-cyan-200 hover:bg-cyan-500/20'
                  : isDark ? 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800' : 'text-zinc-600 border-transparent hover:text-zinc-950 hover:bg-zinc-200'
              }`}
              title="Restart Bot"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </motion.button>

            <motion.button
              id="btn-edit-bot"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              onClick={() => onEdit(bot)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isColourUI
                  ? 'text-sky-400 border-sky-500/30 hover:text-sky-200 hover:bg-sky-500/20'
                  : isDark ? 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-zinc-800' : 'text-zinc-600 border-transparent hover:text-zinc-900 hover:bg-zinc-200'
              }`}
              title="Configure Bot Settings"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </motion.button>

            <motion.button
              id="btn-delete-bot"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              onClick={() => onDelete(bot.id)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isColourUI
                  ? 'text-rose-400 border-rose-500/30 hover:text-rose-200 hover:bg-rose-500/20'
                  : isDark ? 'text-zinc-500 border-transparent hover:text-rose-400 hover:bg-zinc-800' : 'text-zinc-500 border-transparent hover:text-rose-600 hover:bg-zinc-200'
              }`}
              title="Delete Bot Profile"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Error alert banner if any */}
      {bot.lastError && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
            isDark ? 'bg-zinc-950 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Connection Notice:</span> {bot.lastError}
          </div>
        </motion.div>
      )}

      {/* Primary Telemetry: Health & Hunger */}
      <div className={`border rounded-2xl p-4 ${
        isColourUI
          ? 'bg-[#060b16] border-[#1c2b48]'
          : isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
      }`}>
        <HeartsAndHunger
          health={bot.health}
          maxHealth={bot.maxHealth}
          food={bot.food}
          saturation={bot.saturation}
        />
      </div>

      {/* Secondary Telemetry: Uptime, Reconnects, Anti-AFK state, Coordinates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Live Uptime */}
        <div className={`border rounded-xl p-3 transition-all duration-300 ${
          isColourUI
            ? 'bg-sky-950/40 border-sky-500/40 hover:border-sky-500/70 shadow-sm shadow-sky-500/10'
            : isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <div className="flex items-center justify-between gap-1 text-xs mb-1.5 flex-nowrap">
            <div className={`flex items-center gap-1.5 min-w-0 truncate ${
              isColourUI ? 'text-sky-300 font-semibold' : isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}>
              <Clock className={`w-3.5 h-3.5 shrink-0 ${isColourUI ? 'text-sky-400' : 'text-zinc-400'}`} />
              <span className="truncate text-[11px] sm:text-xs">Uptime</span>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 leading-tight ${
              bot.status === 'online'
                ? isColourUI
                  ? 'bg-sky-500/20 text-sky-200 border-sky-400/60 shadow-[0_0_8px_rgba(14,165,233,0.25)]'
                  : isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-black text-white border-black'
                : isColourUI
                ? 'bg-slate-800/80 text-slate-400 border-slate-700'
                : isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-200 text-zinc-600 border-zinc-300'
            }`}>
              {bot.status === 'online' ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>
          <p className={`text-sm font-bold font-mono truncate ${
            isColourUI ? 'text-sky-100' : isDark ? 'text-white' : 'text-zinc-900'
          }`}>
            {formatUptime(bot.uptimeSeconds)}
          </p>
        </div>

        {/* Auto-Reconnect Status */}
        <div className={`border rounded-xl p-3 transition-all duration-300 ${
          isColourUI
            ? 'bg-purple-950/40 border-purple-500/40 hover:border-purple-500/70 shadow-sm shadow-purple-500/10'
            : isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <div className="flex items-center justify-between gap-1 text-xs mb-1.5 flex-nowrap">
            <div className={`flex items-center gap-1.5 min-w-0 truncate ${
              isColourUI ? 'text-purple-300 font-semibold' : isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}>
              <RotateCcw className={`w-3.5 h-3.5 shrink-0 ${isColourUI ? 'text-purple-400' : 'text-zinc-400'}`} />
              <span className="truncate text-[11px] sm:text-xs">Reconnect</span>
            </div>
            {onToggleAutoReconnect ? (
              <button
                type="button"
                onClick={() => onToggleAutoReconnect(bot.id, !bot.config.autoReconnect)}
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 leading-tight transition-all cursor-pointer ${
                  bot.config.autoReconnect
                    ? isColourUI
                      ? 'bg-purple-500/20 text-purple-200 border-purple-400/60 shadow-[0_0_8px_rgba(168,85,247,0.25)] hover:bg-purple-500/30'
                      : isDark ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:text-white' : 'bg-black text-white border-black hover:bg-zinc-800'
                    : isColourUI
                    ? 'text-slate-400 bg-slate-800/80 border-slate-700 hover:text-slate-200'
                    : isDark ? 'text-zinc-500 bg-zinc-900 border-zinc-800 hover:text-zinc-300' : 'text-zinc-500 bg-zinc-200 border-zinc-300 hover:text-zinc-700'
                }`}
                title="Click to toggle 24/7 Auto-Reconnect"
              >
                {bot.config.autoReconnect ? '24/7 ON' : 'PAUSED'}
              </button>
            ) : bot.config.autoReconnect ? (
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 leading-tight transition-all duration-300 ${
                isColourUI
                  ? 'bg-purple-500/20 text-purple-200 border-purple-400/60 shadow-[0_0_8px_rgba(168,85,247,0.25)]'
                  : isDark ? 'bg-zinc-800 text-zinc-200 border-zinc-700' : 'bg-black text-white border-black'
              }`}>
                24/7 ON
              </span>
            ) : (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 leading-tight ${
                isColourUI
                  ? 'text-slate-400 bg-slate-800/80 border-slate-700'
                  : isDark ? 'text-zinc-500 bg-zinc-900 border-zinc-800' : 'text-zinc-500 bg-zinc-200 border-zinc-300'
              }`}>
                PAUSED
              </span>
            )}
          </div>
          <p className={`text-sm font-bold font-mono truncate ${
            isColourUI ? 'text-purple-100' : isDark ? 'text-white' : 'text-zinc-900'
          }`}>
            {bot.reconnectCount} Rejoins
          </p>
        </div>

        {/* Anti-AFK Routine Status */}
        <div className={`border rounded-xl p-3 transition-all duration-300 ${
          isColourUI
            ? 'bg-amber-950/40 border-amber-500/40 hover:border-amber-500/70 shadow-sm shadow-amber-500/10'
            : isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <div className="flex items-center justify-between gap-1 text-xs mb-1.5 flex-nowrap">
            <div className={`flex items-center gap-1.5 min-w-0 truncate ${
              isColourUI ? 'text-amber-300 font-semibold' : isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}>
              <Zap className={`w-3.5 h-3.5 shrink-0 ${isColourUI ? 'text-amber-400' : isDark ? 'text-white' : 'text-black'}`} />
              <span className="truncate text-[11px] sm:text-xs">Anti-AFK</span>
            </div>
            <button
              type="button"
              onClick={() => onToggleAntiAfk(bot.id, !bot.config.antiAfk.enabled)}
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 leading-tight cursor-pointer transition-all ${
                bot.config.antiAfk.enabled
                  ? isColourUI
                    ? 'bg-amber-500/20 text-amber-200 border-amber-400/60 shadow-[0_0_8px_rgba(245,158,11,0.25)] hover:bg-amber-500/30'
                    : isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700 hover:text-white hover:bg-zinc-700' : 'bg-black text-white border-black hover:bg-zinc-800'
                  : isColourUI
                  ? 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-300 hover:border-slate-600'
                  : isDark ? 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-400' : 'bg-zinc-200 text-zinc-600 border-zinc-300 hover:text-zinc-800'
              }`}
              title="Click to toggle Anti-AFK routine"
            >
              {bot.config.antiAfk.enabled ? 'RUNNING' : 'PAUSED'}
            </button>
          </div>
          <div className="flex items-center justify-between gap-1">
            <p className={`text-xs sm:text-sm font-bold font-mono truncate ${
              isColourUI ? 'text-amber-100' : isDark ? 'text-white' : 'text-zinc-900'
            }`}>
              {bot.config.antiAfk.enabled ? `Every ${bot.config.antiAfk.intervalSeconds}s` : 'Paused'}
            </p>
            {/* Sleek mini pill toggle button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => onToggleAntiAfk(bot.id, !bot.config.antiAfk.enabled)}
              className={`w-8 h-4.5 flex items-center rounded-full px-0.5 cursor-pointer transition-colors border shrink-0 ${
                bot.config.antiAfk.enabled
                  ? isColourUI
                    ? 'bg-amber-500 border-amber-400 shadow-xs'
                    : isDark ? 'bg-zinc-100 border-white' : 'bg-zinc-900 border-zinc-900'
                  : isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-300 border-zinc-400'
              }`}
              title="Toggle Anti-AFK"
            >
              <motion.div
                animate={{ x: bot.config.antiAfk.enabled ? 14 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`w-3 h-3 rounded-full shadow-xs ${
                  bot.config.antiAfk.enabled
                    ? isColourUI ? 'bg-zinc-950' : isDark ? 'bg-zinc-950' : 'bg-white'
                    : isDark ? 'bg-zinc-400' : 'bg-white'
                }`}
              />
            </motion.button>
          </div>
        </div>

        {/* Coordinates */}
        <div className={`border rounded-xl p-3 flex flex-col justify-between transition-all duration-300 ${
          isColourUI
            ? 'bg-fuchsia-950/40 border-fuchsia-500/40 hover:border-fuchsia-500/70 shadow-sm shadow-fuchsia-500/10'
            : isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <div className="flex items-center justify-between gap-1 text-xs mb-1.5 flex-nowrap">
            <div className={`flex items-center gap-1.5 min-w-0 truncate ${
              isColourUI ? 'text-fuchsia-300 font-semibold' : isDark ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              <Compass className={`w-3.5 h-3.5 shrink-0 ${isColourUI ? 'text-fuchsia-400' : 'text-zinc-400'}`} />
              <span className="truncate text-[11px] sm:text-xs">Coordinates</span>
            </div>
            {onOpenNetherCalc && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={onOpenNetherCalc}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 cursor-pointer transition-all leading-tight ${
                  isColourUI
                    ? 'text-fuchsia-200 bg-fuchsia-500/20 border-fuchsia-400/60 shadow-[0_0_8px_rgba(217,70,239,0.2)] hover:bg-fuchsia-500/35 hover:border-fuchsia-400'
                    : isDark ? 'text-zinc-300 bg-zinc-800 border-zinc-700 hover:text-white hover:border-zinc-600' : 'text-zinc-700 bg-zinc-200 border-zinc-300 hover:text-zinc-950 hover:border-zinc-400'
                }`}
                title="Open coordinates in Nether Portal Calculator"
              >
                <span>Calc Portal</span>
              </motion.button>
            )}
          </div>
          <p className={`text-xs font-mono font-bold truncate ${
            isColourUI ? 'text-fuchsia-100' : isDark ? 'text-zinc-200' : 'text-zinc-800'
          }`}>
            {Math.round(bot.position.x)}, {Math.round(bot.position.y)}, {Math.round(bot.position.z)}
          </p>
        </div>
      </div>
    </div>
  );
};
