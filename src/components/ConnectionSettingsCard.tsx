import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Server,
  Terminal,
  Save,
  Check,
  RotateCcw,
} from 'lucide-react';
import { BotConfig } from '../types';
import { useTheme } from '../context/ThemeContext';
import { parseAndCleanServerAddress } from '../utils/serverAddress';

interface ConnectionSettingsCardProps {
  config: BotConfig;
  isOnline: boolean;
  onSaveConfig: (updated: Partial<BotConfig>) => Promise<void>;
  onTestDisconnect?: () => void;
}

export const ConnectionSettingsCard: React.FC<ConnectionSettingsCardProps> = ({
  config,
  onSaveConfig,
}) => {
  const { theme, isDark, isColourUI } = useTheme();

  const [formData, setFormData] = useState<BotConfig>({ ...config });
  const [portInput, setPortInput] = useState<string>(String(config.port || 25565));
  const [smartNotice, setSmartNotice] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setFormData({ ...config });
    setPortInput(String(config.port || 25565));
  }, [config]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const currentPortNum = parseInt(portInput.trim(), 10) || 25565;
      const parsed = parseAndCleanServerAddress(formData.host, currentPortNum);
      const finalHost = parsed.host || 'play.hypixel.net';
      const finalPort = parsed.hasPort && parsed.port ? parsed.port : currentPortNum;

      await onSaveConfig({ ...formData, host: finalHost, port: finalPort });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const versions = [
    { label: 'Auto Detect (Recommended)', value: '' },
    { label: '1.20.4', value: '1.20.4' },
    { label: '1.20.1', value: '1.20.1' },
    { label: '1.19.4', value: '1.19.4' },
    { label: '1.18.2', value: '1.18.2' },
    { label: '1.16.5', value: '1.16.5' },
    { label: '1.12.2', value: '1.12.2' },
    { label: '1.8.9', value: '1.8.9' },
  ];

  return (
    <div id="connection-settings-card" className={`border rounded-2xl p-5 shadow-xl space-y-5 transition-colors ${
      isColourUI
        ? 'bg-[#0a1024] border-cyan-500/30 shadow-[0_0_24px_rgba(6,182,212,0.12)]'
        : isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
    }`}>
      <div className={`flex items-center justify-between border-b pb-3 ${
        isColourUI ? 'border-cyan-500/20' : isDark ? 'border-zinc-800' : 'border-zinc-200'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm ${
            isColourUI
              ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-zinc-100 border-zinc-300 text-zinc-800'
          }`}>
            <Server className={`w-4 h-4 ${isColourUI ? 'text-cyan-400' : ''}`} />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isColourUI ? 'text-cyan-100' : isDark ? 'text-white' : 'text-zinc-900'}`}>
              Server & Auto-Rejoin Configuration
            </h3>
            <p className={`text-xs ${isColourUI ? 'text-slate-400' : isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Connection credentials, on-join command, and reconnect rules
            </p>
          </div>
        </div>

        {isSaved && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-1.5 text-xs font-mono font-bold ${
              isColourUI ? 'text-emerald-300 drop-shadow-xs' : isDark ? 'text-zinc-200' : 'text-zinc-900'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            Saved!
          </motion.span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Server & Port */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={`block font-semibold mb-1.5 ${
                isColourUI ? 'text-cyan-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
              }`}>
                Minecraft Server Host / IP
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => handleHostInput(e.target.value)}
                onBlur={(e) => handleHostInput(e.target.value, true)}
                placeholder="e.g. yourserver.aternos.me:15087 or play.hypixel.net"
                required
                className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none transition-all ${
                  isColourUI
                    ? 'bg-[#060a16] border-slate-800 text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500'
                }`}
              />
            </div>

            <div>
              <label className={`block font-semibold mb-1.5 ${
                isColourUI ? 'text-cyan-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
              }`}>Port</label>
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
                className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none transition-all ${
                  isColourUI
                    ? 'bg-[#060a16] border-slate-800 text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500'
                }`}
              />
            </div>
          </div>

          {/* Smart Notice Feedback */}
          {smartNotice && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono animate-fade-in ${
              isColourUI
                ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-300'
                : isDark
                ? 'bg-zinc-900 border-zinc-700 text-zinc-300'
                : 'bg-zinc-100 border-zinc-300 text-zinc-800'
            }`}>
              <span>{smartNotice}</span>
            </div>
          )}
        </div>

        {/* Username & Auth Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={`block font-semibold mb-1.5 ${
              isColourUI ? 'text-indigo-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              Bot Username / In-Game Name
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="e.g. NinimoBot"
              required
              className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none transition-all ${
                isColourUI
                  ? 'bg-[#060a16] border-slate-800 text-indigo-100 focus:border-indigo-400 focus:shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                  : isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500'
              }`}
            />
          </div>

          <div>
            <label className={`block font-semibold mb-1.5 ${
              isColourUI ? 'text-indigo-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              Authentication Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setFormData({ ...formData, auth: 'offline' })}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  formData.auth === 'offline'
                    ? isColourUI
                      ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                      : isDark
                      ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm'
                      : 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                    : isColourUI
                    ? 'bg-[#060a16] border-slate-800 text-slate-400 hover:border-indigo-500/40 hover:text-slate-200'
                    : isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Cracked (Offline)
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setFormData({ ...formData, auth: 'microsoft' })}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  formData.auth === 'microsoft'
                    ? isColourUI
                      ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                      : isDark
                      ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm'
                      : 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                    : isColourUI
                    ? 'bg-[#060a16] border-slate-800 text-slate-400 hover:border-indigo-500/40 hover:text-slate-200'
                    : isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Premium (Microsoft)
              </motion.button>
            </div>
          </div>
        </div>

        {/* Version */}
        <div>
          <label className={`block font-semibold mb-1.5 ${
            isColourUI ? 'text-indigo-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
          }`}>
            Minecraft Version
          </label>
          <select
            value={formData.version || ''}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            className={`w-full border rounded-xl px-3 py-2 font-mono focus:outline-none cursor-pointer ${
              isColourUI
                ? 'bg-[#060a16] border-slate-800 text-cyan-200 focus:border-cyan-400'
                : isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500'
            }`}
          >
            {versions.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {/* On-Join Command / Word */}
        <div className={`border rounded-xl p-3.5 space-y-2.5 ${
          isColourUI
            ? 'bg-[#060a16] border-indigo-500/20'
            : isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <div className="flex items-center justify-between">
            <label className={`font-bold flex items-center gap-1.5 ${
              isColourUI ? 'text-cyan-300' : isDark ? 'text-zinc-200' : 'text-zinc-800'
            }`}>
              <Terminal className={`w-3.5 h-3.5 ${isColourUI ? 'text-cyan-400' : 'text-zinc-400'}`} />
              On-Join Command or Word
            </label>
            <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
              isColourUI
                ? 'text-cyan-200 bg-cyan-950/60 border-cyan-500/60 shadow-xs'
                : isDark ? 'text-zinc-300 bg-zinc-900 border-zinc-700' : 'text-zinc-700 bg-white border-zinc-300'
            }`}>
              Delay: {formData.onJoinDelayMs}ms
            </span>
          </div>

          <p className={`text-[11px] ${isColourUI ? 'text-slate-400' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Automatically executed once the bot spawns into the Minecraft world.
          </p>

          <input
            type="text"
            value={formData.onJoinCommand}
            onChange={(e) => setFormData({ ...formData, onJoinCommand: e.target.value })}
            placeholder="e.g. /login 123456 or /register pass pass or /server survival"
            className={`w-full border rounded-lg px-3 py-2 font-mono focus:outline-none text-xs ${
              isColourUI
                ? 'bg-[#090e1f] border-slate-700 text-white focus:border-cyan-400'
                : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-500'
            }`}
          />

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-medium ${isColourUI ? 'text-slate-400' : 'text-zinc-500'}`}>Fast (500ms)</span>
            <input
              type="range"
              min="500"
              max="5000"
              step="250"
              value={formData.onJoinDelayMs}
              onChange={(e) => setFormData({ ...formData, onJoinDelayMs: Number(e.target.value) })}
              className={`flex-1 h-1.5 rounded-lg cursor-pointer ${
                isColourUI
                  ? 'accent-cyan-400 bg-slate-800'
                  : isDark ? 'accent-zinc-200 bg-zinc-800' : 'accent-zinc-800 bg-zinc-200'
              }`}
            />
            <span className={`text-[10px] font-medium ${isColourUI ? 'text-slate-400' : 'text-zinc-500'}`}>Safe (5000ms)</span>
          </div>
        </div>

        {/* Reconnect System */}
        <div className={`border rounded-xl p-3.5 space-y-3 ${
          isColourUI
            ? 'bg-[#060a16] border-indigo-500/20'
            : isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className={`w-3.5 h-3.5 ${isColourUI ? 'text-emerald-400' : 'text-zinc-400'}`} />
              <span className={`font-bold ${isColourUI ? 'text-emerald-300' : isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                24/7 Auto-Reconnect System
              </span>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => setFormData({ ...formData, autoReconnect: !formData.autoReconnect })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.autoReconnect
                  ? isColourUI
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : isDark ? 'bg-zinc-200' : 'bg-zinc-900'
                  : isDark ? 'bg-zinc-800' : 'bg-zinc-300'
              }`}
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg ${
                  formData.autoReconnect
                    ? isColourUI
                      ? 'bg-zinc-950 translate-x-5'
                      : isDark ? 'bg-zinc-950 translate-x-5' : 'bg-white translate-x-5'
                    : 'bg-white translate-x-0'
                }`}
              />
            </motion.button>
          </div>

          <p className={`text-[11px] ${isColourUI ? 'text-slate-400' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Automatically rejoins server if kicked, timed out, or after server restarts.
          </p>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className={`font-medium ${isColourUI ? 'text-slate-300' : isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Reconnect retry delay:
            </span>
            <div className="flex gap-1.5">
              {[3, 5, 10, 30].map((s) => (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setFormData({ ...formData, reconnectDelaySeconds: s })}
                  className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                    formData.reconnectDelaySeconds === s
                      ? isColourUI
                        ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : isDark
                        ? 'bg-zinc-800 text-zinc-100 border-zinc-600 shadow-sm'
                        : 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                      : isColourUI
                      ? 'bg-[#090e1f] border-slate-700 text-slate-300 hover:border-emerald-500/60 hover:text-white'
                      : isDark
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                      : 'bg-white border-zinc-300 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {s}s
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit & Save */}
        <div className="flex items-center justify-end pt-2">
          <motion.button
            id="btn-save-settings"
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
            type="submit"
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer border ${
              isColourUI
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white border-cyan-400/50 shadow-[0_0_16px_rgba(6,182,212,0.3)]'
                : isDark
                ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-white disabled:bg-zinc-800 disabled:text-zinc-600'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900 shadow-zinc-900/20 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:border-zinc-300'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Apply & Save Settings'}</span>
          </motion.button>
        </div>
      </form>
    </div>
  );
};
