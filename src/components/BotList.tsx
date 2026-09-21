import React from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Square,
  Zap,
  Users,
  Plus,
} from 'lucide-react';
import { BotState } from '../types';
import { useTheme } from '../context/ThemeContext';

interface BotListProps {
  bots: BotState[];
  selectedBotId: string | null;
  globalBotLimit?: number;
  isAdmin?: boolean;
  onSelectBot: (id: string) => void;
  onStartBot: (id: string) => void;
  onStopBot: (id: string) => void;
  onAddNewBot: () => void;
}

export const BotList: React.FC<BotListProps> = ({
  bots,
  selectedBotId,
  globalBotLimit = 1,
  isAdmin = false,
  onSelectBot,
  onStartBot,
  onStopBot,
  onAddNewBot,
}) => {
  const { theme, isDark, isColourUI } = useTheme();

  return (
    <div id="bot-list-container" className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
          isColourUI ? 'text-indigo-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
        }`}>
          <Users className={`w-3.5 h-3.5 ${isColourUI ? 'text-indigo-400' : 'text-zinc-400'}`} />
          <span>Active Bot Fleet {isAdmin ? `(${bots.length} Bots • Unlimited)` : `(${bots.length}/${globalBotLimit} Bots)`}</span>
        </div>
        {!isAdmin && bots.length >= globalBotLimit ? (
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-sm ${
            isColourUI
              ? 'text-purple-300 bg-purple-950/40 border-purple-500/30'
              : isDark ? 'text-zinc-400 bg-zinc-900 border-zinc-800' : 'text-zinc-600 bg-zinc-100 border-zinc-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isColourUI ? 'bg-purple-400' : 'bg-zinc-400'}`} />
            {bots.length}/{globalBotLimit} Limit Reached
          </span>
        ) : (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onAddNewBot}
            className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 border rounded-xl transition-all cursor-pointer shadow-xs ${
              isColourUI
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : isDark
                ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-white'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Bot {isAdmin ? `(${bots.length})` : `(${bots.length}/${globalBotLimit})`}</span>
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {bots.map((bot, index) => {
          const isSelected = bot.id === selectedBotId;
          const isOnline = bot.status === 'online';
          const isReconnecting = bot.status === 'reconnecting';
          const isStarting = bot.status === 'starting';

          const statusColor = isOnline
            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
            : isReconnecting
            ? 'bg-amber-400 animate-pulse'
            : isStarting
            ? 'bg-sky-400 animate-pulse'
            : 'bg-zinc-600';

          return (
            <motion.div
              key={bot.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 350, damping: 20 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectBot(bot.id)}
              className={`group relative rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-md ${
                isColourUI
                  ? isSelected
                    ? 'bg-[#0f172a] border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-1 ring-indigo-400/50'
                    : 'bg-[#0a101f]/80 border-slate-800/80 hover:border-indigo-500/40 hover:bg-[#0f172a]'
                  : isDark
                  ? isSelected
                    ? 'bg-zinc-900 border-zinc-500 shadow-lg shadow-black/40 ring-1 ring-zinc-500'
                    : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                  : isSelected
                  ? 'bg-white border-zinc-900 shadow-lg shadow-zinc-300 ring-1 ring-zinc-900'
                  : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar with Head */}
                  <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-xl border p-0.5 shadow-sm overflow-hidden flex items-center justify-center ${
                      isColourUI
                        ? 'bg-[#080d1a] border-slate-700'
                        : isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                    }`}>
                      <img
                        src={`https://mc-heads.net/avatar/${encodeURIComponent(bot.config.username)}/64`}
                        alt={bot.config.username}
                        referrerPolicy="no-referrer"
                        className="w-full h-full rounded-lg object-cover pixelated"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 ${
                        isColourUI ? 'border-[#0a101f]' : isDark ? 'border-zinc-900' : 'border-white'
                      } z-10 ${statusColor}`}
                    />
                  </div>

                  {/* Name & Host */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <h4 className={`font-extrabold text-sm truncate ${
                        isColourUI ? 'text-white' : isDark ? 'text-zinc-100' : 'text-zinc-900'
                      }`}>
                        {bot.config.username}
                      </h4>
                    </div>
                    <p className={`text-xs font-mono truncate ${
                      isColourUI ? 'text-sky-300/80' : isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}>
                      {bot.config.host}:{bot.config.port}
                    </p>
                  </div>
                </div>

                {/* Quick Start/Stop */}
                <div onClick={(e) => e.stopPropagation()}>
                  {isOnline || isReconnecting || isStarting ? (
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onStopBot(bot.id)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        isColourUI
                          ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40 shadow-xs'
                          : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border-rose-500/30'
                      }`}
                      title="Stop Bot"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onStartBot(bot.id)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer shadow-xs ${
                        isColourUI
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 border-emerald-300/60 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                          : isDark
                          ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-white'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900 shadow-zinc-900/20'
                      }`}
                      title="Start Bot"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Badges & Meta */}
              <div className={`flex items-center justify-between text-xs pt-2 border-t ${
                isColourUI
                  ? 'border-slate-800 text-slate-400'
                  : isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-zinc-200 text-zinc-500'
              }`}>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-extrabold uppercase text-[10px] px-2.5 py-0.5 rounded-full border ${
                      isOnline
                        ? isColourUI
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-xs'
                          : isDark
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                          : 'bg-black text-white border-black'
                        : isReconnecting
                        ? isColourUI
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/60'
                          : isDark
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                          : 'bg-zinc-800 text-white border-zinc-800'
                        : isStarting
                        ? isColourUI
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400/60'
                          : isDark
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                          : 'bg-zinc-800 text-white border-zinc-800'
                        : isColourUI
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                    }`}
                  >
                    {isOnline ? 'CONNECTED' : isStarting ? 'CONNECTING' : bot.status}
                  </span>

                  {bot.config.antiAfk.enabled && (
                    <span className={`flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${
                      isColourUI
                        ? 'text-amber-200 bg-amber-950/60 border-amber-500/60 shadow-xs'
                        : isDark ? 'text-zinc-100 bg-zinc-800 border-zinc-700' : 'text-black bg-zinc-100 border-zinc-300'
                    }`}>
                      <Zap className={`w-3 h-3 ${isColourUI ? 'text-amber-400' : isDark ? 'text-white' : 'text-black'}`} />
                      AFK ({bot.config.antiAfk.intervalSeconds}s)
                    </span>
                  )}
                </div>

                <div className="font-mono text-xs">
                  {isOnline ? (
                    <span className={`font-extrabold ${isColourUI ? 'text-emerald-300 drop-shadow-xs' : isDark ? 'text-emerald-400' : 'text-black'}`}>
                      HP: {bot.health}/20
                    </span>
                  ) : (
                    <span className={isColourUI ? 'text-slate-500' : 'text-zinc-500'}>Offline</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
