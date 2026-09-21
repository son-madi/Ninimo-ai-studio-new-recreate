import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, Server, Shield, 
  Swords, Pickaxe, Map, Wrench, 
  Settings, Power, Info 
} from 'lucide-react';
import { BotState, BotConfig } from '../types';
import { useTheme } from '../context/ThemeContext';
import { BotPluginSidebar } from './BotPluginSidebar';
import { BotViewport } from './BotViewport';
import { NinimoIcon } from './NinimoIcon';

interface BotWorkspaceProps {
  activeBot: BotState;
  onClose: () => void;
  onUpdateConfig: (updates: Partial<BotConfig>) => Promise<void>;
  onStopBot: () => Promise<void>;
  onStartBot: () => Promise<void>;
  onClearChat: () => Promise<void>;
  onSendChat: (msg: string) => Promise<boolean>;
}

export const BotWorkspace: React.FC<BotWorkspaceProps> = ({
  activeBot,
  onClose,
  onUpdateConfig,
  onStopBot,
  onStartBot,
  onClearChat,
  onSendChat
}) => {
  const { theme, isDark, isColourUI } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auto-close sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-colors ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    }`}>
      {/* Top Navigation Bar */}
      <div className={`h-14 flex items-center justify-between px-2 sm:px-4 border-b shrink-0 ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors shrink-0 ${
              isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
            }`}
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <NinimoIcon size="sm" />
          
          <div className="flex items-center gap-2 font-bold min-w-0 overflow-hidden">
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ${
              activeBot.status === 'online' ? (isColourUI ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : isDark ? 'bg-zinc-200' : 'bg-zinc-900') :
              activeBot.status === 'starting' || activeBot.status === 'reconnecting' ? 'bg-amber-500 animate-pulse' :
              activeBot.status === 'error' ? 'bg-rose-500' : 'bg-zinc-500'
            }`} />
            <span className="truncate max-w-[100px] sm:max-w-none text-sm sm:text-base">{activeBot.config.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-zinc-950 font-mono font-black uppercase tracking-wider shadow-xs">
              3D BETA
            </span>
            <span className={`hidden sm:inline-block text-xs px-2 py-0.5 rounded-full font-mono ${
              isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
            }`}>
              {activeBot.config.host}:{activeBot.config.port}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
          {activeBot.status === 'online' ? (
            <button
              onClick={onStopBot}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors flex items-center gap-1 sm:gap-1.5"
            >
              <Power className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Stop</span>
            </button>
          ) : (
            <button
              onClick={onStartBot}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 sm:gap-1.5 ${
                isDark ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
              <Power className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Start</span>
            </button>
          )}
          <button 
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            }`}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Plugin Manager */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              style={{ willChange: 'width, transform' }}
              className={`absolute lg:relative z-40 h-full shrink-0 border-r overflow-y-auto overflow-x-hidden ${
                isDark ? 'bg-zinc-900 border-zinc-800 shadow-[4px_0_24px_rgba(0,0,0,0.5)] lg:shadow-none' : 'bg-white border-zinc-200 shadow-[4px_0_24px_rgba(0,0,0,0.1)] lg:shadow-none'
              }`}
            >
              <div className="w-[320px]">
                <BotPluginSidebar 
                  bot={activeBot} 
                  onUpdateConfig={onUpdateConfig} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backdrop for mobile sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
              className="absolute inset-0 z-30 bg-black/50 lg:hidden backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        {/* 3D Viewport & HUD */}
        <div className={`flex-1 relative overflow-hidden flex flex-col ${
          isDark ? 'bg-zinc-950' : 'bg-zinc-100'
        }`}>
          <BotViewport 
            bot={activeBot} 
            onSendChat={onSendChat}
            onClearChat={onClearChat}
          />
        </div>
      </div>
    </div>
  );
};
