import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Blocks, Pickaxe, MessageCircle, Shield, Briefcase, Info, 
  Compass, Search, Wheat, Moon, Map, Utensils, Swords, 
  Keyboard, UserPlus, Package, Crosshair, Wrench, Settings2
} from 'lucide-react';
import { BotConfig, BotPluginsConfig } from '../types';
import { useTheme } from '../context/ThemeContext';
import { PluginSettingsModal } from './PluginSettingsModal';

interface BotPluginsCardProps {
  config: BotConfig;
  isOnline: boolean;
  botId: string;
  onUpdateConfig: (updated: Partial<BotPluginsConfig>) => Promise<void>;
}

interface PluginRowProps {
  id: keyof BotPluginsConfig;
  icon: React.ElementType;
  title: string;
  description: string;
  isEnabled: boolean;
  badge?: 'PRO' | 'DEV';
  isDark: boolean;
  onToggle: (checked: boolean) => void;
  onOpenSettings: () => void;
}

const PluginRow: React.FC<PluginRowProps> = ({ id, icon: Icon, title, description, isEnabled, badge, isDark, onToggle, onOpenSettings }) => {
  const hasSettings = true;

  return (
    <div className={`flex flex-col p-3 border rounded-xl transition-colors ${
      isDark ? 'bg-zinc-950/40 border-zinc-800/80 hover:bg-zinc-900' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/80'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
            isEnabled
              ? isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-zinc-900 border-zinc-900 text-white'
              : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-white border-zinc-200 text-zinc-400'
          }`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-[11px] font-bold mb-0.5 flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {title}
              {badge === 'PRO' && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-200'
                } border`}>PRO</span>
              )}
              {badge === 'DEV' && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-200 text-zinc-800 border-zinc-300'
                } border`}>DEV</span>
              )}
            </div>
            <div className={`text-[10px] leading-snug ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{description}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-1 ml-2 shrink-0">
          {hasSettings && isEnabled && (
            <button
              onClick={onOpenSettings}
              className={`p-1.5 rounded-md border transition-colors ${
                isDark 
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white' 
                  : 'bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          )}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-7 h-4 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${
              isDark
                ? 'bg-zinc-800 peer-checked:bg-zinc-100 peer-checked:after:bg-zinc-950 after:border-zinc-700'
                : 'bg-zinc-300 peer-checked:bg-zinc-900 after:border-zinc-400'
            }`} />
          </label>
        </div>
      </div>
    </div>
  );
};

export const BotPluginsCard: React.FC<BotPluginsCardProps> = ({ config, isOnline, botId, onUpdateConfig }) => {
  const { isDark } = useTheme();
  const [expandedCategory, setExpandedCategory] = useState<string>('movement');
  const [settingsModalId, setSettingsModalId] = useState<keyof BotPluginsConfig | null>(null);

  const plugins: BotPluginsConfig = config.plugins || {
    inventorySync: false,
    inventoryControl: false,
    compassNavigation: false,
    collectDrops: false,
    locate: false,
    farmer: false,
    autoSleep: false,
    chatAi: false,
    pathfinding: false,
    autoEat: false,
    guarding: false,
    autoMining: false,
    pvpMode: false,
    keyboardCapture: false,
    followPlayer: false,
  };

  const handleToggle = (key: keyof BotPluginsConfig, checked: boolean) => {
    onUpdateConfig({ [key]: checked });
  };

  const categories = [
    {
      id: 'movement',
      title: 'Movement & Navigation',
      icon: Compass,
      plugins: [
        { id: 'pathfinding', title: 'Pathfinding', description: 'Advanced A* pathfinding & safe step navigation.', icon: Map, badge: 'ACTIVE' },
        { id: 'followPlayer', title: 'Follow Player', description: 'Follow target nickname smoothly.', icon: UserPlus, badge: 'DEV' },
        { id: 'compassNavigation', title: 'Compass Navigation', description: 'Precision step movement in 3D.', icon: Compass },
        { id: 'locate', title: 'Locate', description: 'Find nearby players, blocks, and entities.', icon: Search },
      ]
    },
    {
      id: 'control',
      title: 'Control & Inventory',
      icon: Wrench,
      plugins: [
        { id: 'inventorySync', title: 'Synchronize Inventory', description: 'Keep web UI hotbar and gear live.', icon: Briefcase },
        { id: 'inventoryControl', title: 'Inventory Control', description: 'Manage drops, equip, and sorting.', icon: Package },
        { id: 'keyboardCapture', title: 'Keyboard Capture', description: 'Control bot via WASD in browser.', icon: Keyboard },
      ]
    }
  ];

  return (
    <div className={`border rounded-2xl p-4 space-y-4 shadow-xl transition-colors ${
      isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
    }`}>
      <div className={`flex items-center justify-between border-b pb-3 ${
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      }`}>
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
          isDark ? 'text-zinc-300' : 'text-zinc-700'
        }`}>
          <Blocks className={`w-4 h-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`} />
          <span>Bot Plugin Modules</span>
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((category) => (
          <div key={category.id} className={`border rounded-xl overflow-hidden transition-colors ${
            isDark ? 'border-zinc-800/80 bg-zinc-900' : 'border-zinc-200 bg-white'
          }`}>
            <button
              onClick={() => setExpandedCategory(expandedCategory === category.id ? '' : category.id)}
              className={`w-full flex items-center justify-between p-3 text-xs font-bold transition-colors ${
                isDark ? 'hover:bg-zinc-800/50 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <category.icon className={`w-4 h-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`} />
                {category.title}
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
              }`}>
                {category.plugins.filter(p => plugins[p.id as keyof BotPluginsConfig]).length} / {category.plugins.length} active
              </span>
            </button>
            
            <AnimatePresence>
              {expandedCategory === category.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`border-t ${isDark ? 'border-zinc-800/80 bg-zinc-950/20' : 'border-zinc-200 bg-zinc-50/50'}`}
                >
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {category.plugins.map((plugin) => (
                      <PluginRow
                        key={plugin.id}
                        id={plugin.id as keyof BotPluginsConfig}
                        icon={plugin.icon}
                        title={plugin.title}
                        description={plugin.description}
                        badge={plugin.badge as 'PRO' | 'DEV' | undefined}
                        isEnabled={Boolean(plugins[plugin.id as keyof BotPluginsConfig])}
                        isDark={isDark}
                        onToggle={(checked) => handleToggle(plugin.id as keyof BotPluginsConfig, checked)}
                        onOpenSettings={() => setSettingsModalId(plugin.id as keyof BotPluginsConfig)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className={`flex items-start gap-2 p-3 rounded-xl border text-[10px] leading-snug ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
      }`}>
        <Info className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        <p>
          PRO modules require premium subscription. DEV modules are currently in alpha testing. Enable <strong className={isDark ? "text-zinc-200" : "text-zinc-900"}>Inventory Sync</strong> to view the real-time hotbar in the dashboard.
        </p>
      </div>
      
      {/* Settings Modal */}
      <PluginSettingsModal
        pluginId={settingsModalId}
        pluginTitle={categories.flatMap(c => c.plugins).find(p => p.id === settingsModalId)?.title || ''}
        plugins={plugins}
        onClose={() => setSettingsModalId(null)}
        onUpdateConfig={onUpdateConfig}
      />
    </div>
  );
};

