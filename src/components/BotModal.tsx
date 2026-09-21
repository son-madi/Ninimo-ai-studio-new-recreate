import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Bot,
  Server,
  Zap,
  RotateCcw,
  Terminal,
  Shield,
  Crown,
} from 'lucide-react';
import { BotConfig, BotState, BotDefaults } from '../types';
import { useTheme } from '../context/ThemeContext';
import { parseAndCleanServerAddress } from '../utils/serverAddress';

interface BotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<BotConfig>) => Promise<void>;
  initialBot?: BotState | null;
  userDefaults?: BotDefaults | null;
}

export const BotModal: React.FC<BotModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBot,
  userDefaults,
}) => {
  const { theme, isDark } = useTheme();

  const [formData, setFormData] = useState<Partial<BotConfig>>({
    name: 'NinimoBot',
    host: userDefaults?.host || 'play.hypixel.net',
    port: userDefaults?.port || 25565,
    username: 'NinimoBot',
    auth: userDefaults?.auth || 'offline',
    password: '',
    version: userDefaults?.version || '',
    autoReconnect: userDefaults?.autoReconnect ?? true,
    reconnectDelaySeconds: userDefaults?.reconnectDelaySeconds || 5,
    maxReconnectAttempts: userDefaults?.maxReconnectAttempts ?? 0,
    onJoinCommand: userDefaults?.onJoinCommand || '',
    onJoinDelayMs: userDefaults?.onJoinDelayMs || 2000,
    antiAfk: userDefaults?.antiAfk || {
      enabled: true,
      intervalSeconds: 20,
      movementType: 'safe_in_place',
      strafeDurationMs: 400,
      swingArm: true,
      sneakWiggle: true,
    },
  });

  const [portInput, setPortInput] = useState<string>(String(userDefaults?.port || 25565));
  const [smartNotice, setSmartNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleHostInput = (rawVal: string, isBlur = false) => {
    const currentPortNum = parseInt(portInput.trim(), 10) || 25565;
    const parsed = parseAndCleanServerAddress(rawVal, currentPortNum);

    if (parsed.hasPort && parsed.port) {
      setPortInput(String(parsed.port));
      setFormData((prev) => ({
        ...prev,
        host: parsed.host,
        port: parsed.port!,
      }));
      setSmartNotice(`Auto-filled port: ${parsed.port}`);
    } else if (isBlur && parsed.corrections.length > 0) {
      setFormData((prev) => ({
        ...prev,
        host: parsed.host,
      }));
      setSmartNotice(`✨ Auto-corrected: ${parsed.corrections.join(', ')}`);
    } else {
      setFormData((prev) => ({
        ...prev,
        host: parsed.host,
      }));
      if (parsed.corrections.length > 0) {
        setSmartNotice(`✨ ${parsed.corrections[0]}`);
      } else if (!isBlur) {
        setSmartNotice(null);
      }
    }
  };

  useEffect(() => {
    if (initialBot) {
      setFormData({ ...initialBot.config });
      setPortInput(String(initialBot.config.port || 25565));
    } else {
      setFormData({
        name: 'NinimoBot',
        host: userDefaults?.host || 'play.hypixel.net',
        port: userDefaults?.port || 25565,
        username: 'NinimoBot',
        auth: userDefaults?.auth || 'offline',
        password: '',
        version: userDefaults?.version || '',
        autoReconnect: userDefaults?.autoReconnect ?? true,
        reconnectDelaySeconds: userDefaults?.reconnectDelaySeconds || 5,
        maxReconnectAttempts: userDefaults?.maxReconnectAttempts ?? 0,
        onJoinCommand: userDefaults?.onJoinCommand || '',
        onJoinDelayMs: userDefaults?.onJoinDelayMs || 2000,
        antiAfk: userDefaults?.antiAfk || {
          enabled: true,
          intervalSeconds: 20,
          movementType: 'safe_in_place',
          strafeDurationMs: 400,
          swingArm: true,
          sneakWiggle: true,
        },
      });
      setPortInput(String(userDefaults?.port || 25565));
    }
  }, [initialBot, isOpen, userDefaults]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const currentPortNum = parseInt(portInput.trim(), 10) || 25565;
      const parsed = parseAndCleanServerAddress(formData.host || '', currentPortNum);
      const finalHost = parsed.host || 'play.hypixel.net';
      const finalPort = parsed.hasPort && parsed.port ? parsed.port : currentPortNum;

      await onSave({
        ...formData,
        host: finalHost,
        port: finalPort,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <motion.div
        id="bot-config-modal"
        initial={{ opacity: 0, scale: 0.93, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className={`border rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative transition-colors will-change-transform transform-gpu ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-zinc-800 bg-zinc-950/70' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-sm ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-zinc-200 border-zinc-300 text-zinc-800'
            }`}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                {initialBot ? 'Edit Bot Profile' : 'Create 24/7 Minecraft Bot'}
              </h3>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Configure connection, anti-AFK, and auto-join
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Bot Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Profile Display Name
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. NinimoBot"
                required
                className={`w-full border rounded-xl px-3.5 py-2.5 font-sans focus:outline-none focus:border-zinc-500 ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                }`}
              />
            </div>

            <div>
              <label className={`block font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Minecraft Username (IGN)
              </label>
              <input
                type="text"
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g. NinimoBot"
                required
                className={`w-full border rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-zinc-500 ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                }`}
              />
            </div>
          </div>

          {/* Server Host & Port */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className={`block font-semibold mb-1 text-xs sm:text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Server IP / Hostname
                </label>
                <input
                  type="text"
                  value={formData.host || ''}
                  onChange={(e) => handleHostInput(e.target.value)}
                  onBlur={(e) => handleHostInput(e.target.value, true)}
                  placeholder="e.g. yourserver.aternos.me:15087 or play.hypixel.net"
                  required
                  className={`w-full border rounded-xl px-3.5 py-2.5 font-mono text-sm focus:outline-none focus:border-zinc-500 transition-colors ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 text-xs sm:text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Port</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={portInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPortInput(val);
                    setFormData((prev) => ({
                      ...prev,
                      port: val === '' ? 25565 : (parseInt(val, 10) || 25565),
                    }));
                  }}
                  onBlur={() => {
                    if (!portInput.trim()) {
                      setPortInput('25565');
                      setFormData((prev) => ({ ...prev, port: 25565 }));
                    }
                  }}
                  placeholder="25565"
                  className={`w-full border rounded-xl px-3.5 py-2.5 font-mono text-sm focus:outline-none focus:border-zinc-500 ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>
            </div>

            {/* Smart Notice */}
            {smartNotice && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono animate-fade-in ${
                isDark 
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-300' 
                  : 'bg-zinc-100 border-zinc-300 text-zinc-800'
              }`}>
                <span>{smartNotice}</span>
              </div>
            )}
          </div>

          {/* Auth mode */}
          <div>
            <label className={`block font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Account Authentication
            </label>
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setFormData({ ...formData, auth: 'offline' })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  formData.auth === 'offline'
                    ? isDark
                      ? 'bg-zinc-800 border-zinc-600 text-white font-bold shadow-sm'
                      : 'bg-zinc-900 border-zinc-900 text-white font-bold shadow-sm'
                    : isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Cracked (Offline Mode)
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setFormData({ ...formData, auth: 'microsoft' })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  formData.auth === 'microsoft'
                    ? isDark
                      ? 'bg-zinc-800 border-zinc-600 text-white font-bold shadow-sm'
                      : 'bg-zinc-900 border-zinc-900 text-white font-bold shadow-sm'
                    : isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Premium (Microsoft)
              </motion.button>
            </div>
          </div>

          {/* Minecraft Version */}
          <div>
            <label className={`block font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Minecraft Version
            </label>
            <select
              value={formData.version || ''}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              className={`w-full border rounded-xl px-3.5 py-2.5 font-sans focus:outline-none focus:border-zinc-500 ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
              }`}
            >
              <option value="">Auto-Detect (Recommended)</option>
              <option value="1.21.1">1.21.1</option>
              <option value="1.21">1.21</option>
              <option value="1.20.6">1.20.6</option>
              <option value="1.20.4">1.20.4</option>
              <option value="1.20.1">1.20.1</option>
              <option value="1.19.4">1.19.4</option>
              <option value="1.18.2">1.18.2</option>
              <option value="1.17.1">1.17.1</option>
              <option value="1.16.5">1.16.5</option>
              <option value="1.12.2">1.12.2</option>
              <option value="1.8.9">1.8.9</option>
            </select>
          </div>

          {/* On-Join Command */}
          <div className={`border rounded-2xl p-3.5 space-y-2 ${
            isDark ? 'bg-zinc-950/50 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <label className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              On-Join Custom Command or Word
            </label>
            <input
              type="text"
              value={formData.onJoinCommand || ''}
              onChange={(e) => setFormData({ ...formData, onJoinCommand: e.target.value })}
              placeholder="e.g. /login 123456 or /register 123456 123456"
              className={`w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none focus:border-zinc-500 ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
              }`}
            />
          </div>

          {/* Anti-AFK Config */}
          <div className={`border rounded-2xl p-3.5 space-y-2.5 ${
            isDark ? 'bg-zinc-950/50 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <div className="flex items-center justify-between">
              <label className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Anti-AFK Movement
              </label>
              <input
                type="checkbox"
                checked={formData.antiAfk?.enabled ?? true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    antiAfk: {
                      ...(formData.antiAfk || {
                        intervalSeconds: 30,
                        movementType: 'strafe_lr',
                        strafeDurationMs: 400,
                        swingArm: true,
                        sneakWiggle: true,
                      }),
                      enabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-zinc-300 focus:ring-zinc-500/30 cursor-pointer"
              />
            </div>
            <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Moves left & right every {formData.antiAfk?.intervalSeconds || 30}s and returns to exact same position.
            </p>
          </div>

          {/* Auto Reconnect */}
          <div className={`flex items-center justify-between p-3.5 border rounded-2xl ${
            isDark ? 'bg-zinc-950/50 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-zinc-400" />
              <div>
                <span className={`font-bold block text-xs ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  24/7 Auto-Reconnect
                </span>
                <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Rejoins automatically after disconnects, kicks, or restarts
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.autoReconnect ?? true}
              onChange={(e) => setFormData({ ...formData, autoReconnect: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-zinc-300 focus:ring-zinc-500/30 cursor-pointer"
            />
          </div>

          {/* Footer buttons */}
          <div className={`flex items-center justify-end gap-3 pt-3 border-t ${
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          }`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl transition-colors font-semibold text-xs cursor-pointer ${
                isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 font-bold text-xs transition-all rounded-xl border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark
                  ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-white shadow-zinc-950/40'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900 shadow-zinc-900/20'
              }`}
            >
              {isSubmitting ? 'Saving...' : initialBot ? 'Update Bot' : 'Create Bot'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
