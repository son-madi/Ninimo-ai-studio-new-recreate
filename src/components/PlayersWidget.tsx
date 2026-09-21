import React from 'react';
import { Users } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface PlayersWidgetProps {
  players: string[];
  botUsername: string;
}

export const PlayersWidget: React.FC<PlayersWidgetProps> = ({ players, botUsername }) => {
  const { theme, isDark, isColourUI } = useTheme();

  return (
    <div
      id="players-nearby-widget"
      className={`border rounded-2xl p-4 shadow-xl space-y-3 transition-colors ${
        isColourUI
          ? 'bg-[#090e1f] border-indigo-500/30 text-slate-100 shadow-[0_0_20px_rgba(99,102,241,0.12)]'
          : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
      }`}
    >
      <div className={`flex items-center justify-between border-b pb-2.5 ${
        isColourUI ? 'border-indigo-500/20' : isDark ? 'border-zinc-800' : 'border-zinc-200'
      }`}>
        <div className={`flex items-center gap-2 text-xs font-semibold ${
          isColourUI ? 'text-indigo-200' : isDark ? 'text-zinc-300' : 'text-zinc-700'
        }`}>
          <Users className={`w-4 h-4 ${isColourUI ? 'text-indigo-400' : 'text-zinc-400'}`} />
          <span>Players in Server ({players.length})</span>
        </div>
      </div>

      {players.length === 0 ? (
        <div className={`py-4 text-center text-xs font-sans ${isColourUI ? 'text-slate-500' : 'text-zinc-500'}`}>
          No players detected on server
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {players.map((p) => {
            const isSelf = p.toLowerCase() === botUsername.toLowerCase();
            return (
              <div
                key={p}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
                  isSelf
                    ? isColourUI
                      ? 'bg-indigo-600/30 border-indigo-400 text-indigo-100 font-bold shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                      : isDark
                      ? 'bg-zinc-800 border-zinc-600 text-white font-bold shadow-xs'
                      : 'bg-white border-zinc-400 text-zinc-950 font-bold shadow-xs'
                    : isColourUI
                    ? 'bg-[#060a16] border-slate-800 text-slate-300 hover:border-indigo-500/40'
                    : isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-800'
                }`}
              >
                <img
                  src={`https://mc-heads.net/avatar/${encodeURIComponent(p)}/16`}
                  alt={p}
                  referrerPolicy="no-referrer"
                  className="w-3.5 h-3.5 rounded-xs object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span>{p}</span>
                {isSelf && (
                  <span className={`text-[9px] px-1 py-0.2 rounded uppercase font-bold ${
                    isColourUI
                      ? 'bg-indigo-500 text-zinc-950'
                      : isDark ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-300 text-zinc-900'
                  }`}>
                    You
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

