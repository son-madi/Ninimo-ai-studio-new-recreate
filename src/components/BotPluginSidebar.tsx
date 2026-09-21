import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Swords, Pickaxe, Wheat, Package, 
  MessageCircle, Compass, Search, UserPlus, Map, 
  Keyboard, Briefcase, Moon, Utensils, Settings, ChevronDown, ChevronRight
} from 'lucide-react';
import { BotState, BotConfig, BotPluginsConfig, PvpSettings } from '../types';
import { useTheme } from '../context/ThemeContext';
import { NinimoIcon } from './NinimoIcon';
import { PluginAdvancedSettings } from './PluginAdvancedSettings';

interface BotPluginSidebarProps {
  bot: BotState;
  onUpdateConfig: (updates: Partial<BotConfig>) => Promise<void>;
}

export const BotPluginSidebar: React.FC<BotPluginSidebarProps> = ({ bot, onUpdateConfig }) => {
  const { theme, isDark, isColourUI } = useTheme();
  const plugins = bot.config.plugins || {} as BotPluginsConfig;
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);

  const handleToggle = (key: keyof BotPluginsConfig, checked: boolean) => {
    onUpdateConfig({ plugins: { ...plugins, [key]: checked } });
  };

  const categories = [
    {
      id: 'movement',
      title: 'Movement & Navigation (Active)',
      color: 'text-cyan-400',
      plugins: [
        { id: 'pathfinding', title: 'Pathfinding', description: 'Dynamic obstacle avoidance & 3D pathing.', icon: Map, badge: 'ACTIVE', iconColor: 'text-blue-400' },
        { id: 'followPlayer', title: 'Follow Player', description: 'Follow target avoiding walls.', icon: UserPlus, badge: 'DEV', iconColor: 'text-sky-400' },
        { id: 'compassNavigation', title: 'Compass', description: 'Step navigate in 3D.', icon: Compass, iconColor: 'text-teal-300' },
        { id: 'locate', title: 'Locate', description: 'Find entities/blocks.', icon: Search, iconColor: 'text-violet-400' },
      ]
    },
    {
      id: 'control',
      title: 'Control & Inventory',
      color: 'text-purple-400',
      plugins: [
        { id: 'inventorySync', title: 'Sync Inventory', description: 'Real-time UI Hotbar & inventory.', icon: Briefcase, iconColor: 'text-purple-400' },
        { id: 'inventoryControl', title: 'Inventory Control', description: 'Manage drops/equip.', icon: Package, iconColor: 'text-fuchsia-400' },
        { id: 'keyboardCapture', title: 'Keyboard Capture', description: 'WASD browser control.', icon: Keyboard, iconColor: 'text-pink-400' },
      ]
    }
  ];

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <NinimoIcon size="sm" />
        <div className="space-y-0.5">
          <h2 className={`text-base font-black tracking-tight leading-tight ${isColourUI ? 'text-white' : ''}`}>Bot Modules</h2>
          <p className={`text-[11px] leading-tight ${isColourUI ? 'text-slate-400' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Configure behaviors & background plugins
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {categories.map((category) => (
          <div key={category.id} className="space-y-2">
            <h3 className={`text-[10px] font-black uppercase tracking-wider ${
              isColourUI ? category.color : isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              {category.title}
            </h3>
            
            <div className="space-y-2">
              {category.plugins.map((plugin) => {
                const isEnabled = Boolean(plugins[plugin.id as keyof BotPluginsConfig]);
                const isExpanded = expandedPlugin === plugin.id;

                return (
                  <div key={plugin.id} className={`border rounded-xl transition-colors ${
                    isColourUI
                      ? isEnabled
                        ? 'bg-[#0a1128] border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                        : 'bg-[#070b19] border-slate-800/80 hover:border-slate-700'
                      : isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white border-zinc-200'
                  }`}>
                    <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpandedPlugin(isExpanded ? null : plugin.id)}>
                      <div className="flex items-center gap-3">
                        <plugin.icon className={`w-4 h-4 ${
                          isColourUI
                            ? isEnabled ? plugin.iconColor : 'text-slate-500'
                            : isEnabled ? (isDark ? 'text-zinc-100' : 'text-zinc-900') : isDark ? 'text-zinc-600' : 'text-zinc-400'
                        }`} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold ${isColourUI ? 'text-slate-100' : ''}`}>{plugin.title}</span>
                            {plugin.badge === 'PRO' && (
                              <span className={`text-[8px] font-black px-1 rounded ${
                                isColourUI ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-amber-500/20 text-amber-500'
                              }`}>PRO</span>
                            )}
                            {plugin.badge === 'DEV' && (
                              <span className={`text-[8px] font-black px-1 rounded ${
                                isColourUI ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30' : isDark ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-zinc-200 text-zinc-800 border border-zinc-300'
                              }`}>DEV</span>
                            )}
                          </div>
                          <div className={`text-[10px] ${isColourUI ? 'text-slate-400' : isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{plugin.description}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => handleToggle(plugin.id as keyof BotPluginsConfig, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className={`w-7 h-4 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${
                            isColourUI
                              ? 'bg-slate-800 peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-indigo-500 after:border-slate-900 peer-checked:shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                              : isDark
                              ? 'bg-zinc-800 peer-checked:bg-zinc-100 peer-checked:after:bg-zinc-950 after:border-zinc-700'
                              : 'bg-zinc-300 peer-checked:bg-zinc-900 after:border-zinc-400'
                          }`} />
                        </label>
                        <button 
                          onClick={() => setExpandedPlugin(isExpanded ? null : plugin.id)}
                          className={`p-1 rounded-md transition-colors ${
                            isColourUI
                              ? 'hover:bg-indigo-500/20 text-slate-400 hover:text-cyan-300'
                              : isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'
                          }`}
                        >
                          <Settings className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className={`overflow-hidden border-t border-dashed ${
                            isColourUI ? 'border-slate-800 bg-[#060a16]' : 'border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <PluginAdvancedSettings 
                            pluginId={plugin.id as any} 
                            plugins={plugins} 
                            onUpdateConfig={async (updates) => onUpdateConfig({ plugins: { ...plugins, ...updates } })} 
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
