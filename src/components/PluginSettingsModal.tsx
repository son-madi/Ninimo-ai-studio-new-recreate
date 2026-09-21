import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings2 } from 'lucide-react';
import { BotPluginsConfig } from '../types';
import { useTheme } from '../context/ThemeContext';
import { PluginAdvancedSettings } from './PluginAdvancedSettings';

interface PluginSettingsModalProps {
  pluginId: keyof BotPluginsConfig | null;
  pluginTitle: string;
  plugins: BotPluginsConfig;
  onClose: () => void;
  onUpdateConfig: (updated: Partial<BotPluginsConfig>) => Promise<void>;
}

export const PluginSettingsModal: React.FC<PluginSettingsModalProps> = ({
  pluginId,
  pluginTitle,
  plugins,
  onClose,
  onUpdateConfig
}) => {
  const { isDark } = useTheme();

  return (
    <AnimatePresence>
      {pluginId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto overscroll-contain">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative my-auto ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white border-zinc-300 text-zinc-600'
                }`}>
                  <Settings2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    Advanced Settings
                  </h3>
                  <p className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Configuring: {pluginTitle}
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
                }`}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5">
              <PluginAdvancedSettings 
                pluginId={pluginId} 
                plugins={plugins} 
                onUpdateConfig={onUpdateConfig} 
                isModal={true}
              />
            </div>
            
            {/* Footer */}
            <div className={`p-4 border-t flex justify-end ${
              isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/50'
            }`}>
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  isDark 
                    ? 'bg-white text-zinc-950 hover:bg-zinc-200' 
                    : 'bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
