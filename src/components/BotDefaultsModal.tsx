import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sliders,
  Server,
  Terminal,
  Zap,
  RotateCcw,
  Check,
  Save,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Command,
} from 'lucide-react';
import { BotDefaults, QuickCommandItem } from '../types';
import { useTheme } from '../context/ThemeContext';
import { parseAndCleanServerAddress } from '../utils/serverAddress';

export const DEFAULT_QUICK_COMMANDS: QuickCommandItem[] = [
  { id: '1', label: '/spawn', cmd: '/spawn' },
  { id: '2', label: '/home', cmd: '/home' },
  { id: '3', label: '/list', cmd: '/list' },
  { id: '4', label: '/help', cmd: '/help' },
  { id: '5', label: '/ping', cmd: '/ping' },
  { id: '6', label: 'Hello!', cmd: 'Hello everyone!' },
];

export const FACTORY_BOT_DEFAULTS: BotDefaults = {
  host: 'play.hypixel.net',
  port: 25565,
  onJoinCommand: '',
  onJoinDelayMs: 2000,
  auth: 'offline',
  version: '',
  autoReconnect: true,
  reconnectDelaySeconds: 5,
  maxReconnectAttempts: 0,
  antiAfk: {
    enabled: true,
    intervalSeconds: 20,
    movementType: 'safe_in_place',
    strafeDurationMs: 400,
    swingArm: true,
    sneakWiggle: true,
  },
  quickCommands: DEFAULT_QUICK_COMMANDS,
};

interface BotDefaultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDefaults: BotDefaults;
  onSaveDefaults: (defaults: BotDefaults) => Promise<void>;
  initialTab?: 'server' | 'quick_messages' | 'antiafk';
}

export const BotDefaultsModal: React.FC<BotDefaultsModalProps> = ({
  isOpen,
  onClose,
  currentDefaults,
  onSaveDefaults,
  initialTab = 'server',
}) => {
  const { theme, isDark, isColourUI } = useTheme();

  const [activeTab, setActiveTab] = useState<'server' | 'quick_messages' | 'antiafk'>(initialTab);

  const tabColorConfig = {
    server: {
      activeText: 'text-sky-300',
      iconColor: 'text-sky-400',
      pill: isDark
        ? 'border-sky-500/70 bg-sky-950/60 text-sky-200 shadow-[0_0_16px_rgba(14,165,233,0.35)] ring-1 ring-sky-400/50'
        : 'border-sky-500 bg-sky-50 text-sky-900 shadow-[0_0_12px_rgba(14,165,233,0.2)] ring-1 ring-sky-300',
      containerBorder: isDark ? 'border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.08)]' : 'border-sky-200',
    },
    quick_messages: {
      activeText: 'text-purple-300',
      iconColor: 'text-purple-400',
      pill: isDark
        ? 'border-purple-500/70 bg-purple-950/60 text-purple-200 shadow-[0_0_16px_rgba(168,85,247,0.35)] ring-1 ring-purple-400/50'
        : 'border-purple-500 bg-purple-50 text-purple-900 shadow-[0_0_12px_rgba(168,85,247,0.2)] ring-1 ring-purple-300',
      containerBorder: isDark ? 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.08)]' : 'border-purple-200',
    },
    antiafk: {
      activeText: 'text-amber-300',
      iconColor: 'text-amber-400',
      pill: isDark
        ? 'border-amber-500/70 bg-amber-950/60 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/50'
        : 'border-amber-500 bg-amber-50 text-amber-900 shadow-[0_0_12px_rgba(245,158,11,0.2)] ring-1 ring-amber-300',
      containerBorder: isDark ? 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)]' : 'border-amber-200',
    },
  };
  const [formData, setFormData] = useState<BotDefaults>(() => ({
    ...FACTORY_BOT_DEFAULTS,
    ...(currentDefaults || {}),
    quickCommands:
      currentDefaults?.quickCommands && currentDefaults.quickCommands.length > 0
        ? currentDefaults.quickCommands
        : DEFAULT_QUICK_COMMANDS,
  }));
  const [portInput, setPortInput] = useState<string>(String(currentDefaults?.port || 25565));
  const [smartNotice, setSmartNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New quick command input state
  const [newCmdLabel, setNewCmdLabel] = useState('');
  const [newCmdText, setNewCmdText] = useState('');
  const [editingCmdId, setEditingCmdId] = useState<string | null>(null);
  const [editCmdLabel, setEditCmdLabel] = useState('');
  const [editCmdText, setEditCmdText] = useState('');

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
    if (isOpen) {
      setActiveTab(initialTab);
      setFormData({
        ...FACTORY_BOT_DEFAULTS,
        ...(currentDefaults || {}),
        quickCommands:
          currentDefaults?.quickCommands && currentDefaults.quickCommands.length > 0
            ? currentDefaults.quickCommands
            : DEFAULT_QUICK_COMMANDS,
      });
      setPortInput(String(currentDefaults?.port || 25565));
      setSmartNotice(null);
      setSavedSuccess(false);
      setEditingCmdId(null);
    }
  }, [isOpen, currentDefaults, initialTab]);

  if (!isOpen) return null;

  const handleResetFactory = () => {
    setFormData(FACTORY_BOT_DEFAULTS);
    setPortInput('25565');
  };

  const handleAddQuickCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCmdLabel.trim() || !newCmdText.trim()) return;

    const newItem: QuickCommandItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: newCmdLabel.trim(),
      cmd: newCmdText.trim(),
    };

    setFormData((prev) => ({
      ...prev,
      quickCommands: [...(prev.quickCommands || []), newItem],
    }));

    setNewCmdLabel('');
    setNewCmdText('');
  };

  const handleDeleteQuickCommand = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      quickCommands: (prev.quickCommands || []).filter((item) => item.id !== id),
    }));
  };

  const handleStartEditQuickCommand = (item: QuickCommandItem) => {
    setEditingCmdId(item.id);
    setEditCmdLabel(item.label);
    setEditCmdText(item.cmd);
  };

  const handleSaveEditQuickCommand = (id: string) => {
    if (!editCmdLabel.trim() || !editCmdText.trim()) return;
    setFormData((prev) => ({
      ...prev,
      quickCommands: (prev.quickCommands || []).map((item) =>
        item.id === id ? { ...item, label: editCmdLabel.trim(), cmd: editCmdText.trim() } : item
      ),
    }));
    setEditingCmdId(null);
  };

  const handleResetQuickCommands = () => {
    setFormData((prev) => ({
      ...prev,
      quickCommands: DEFAULT_QUICK_COMMANDS,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const currentPortNum = parseInt(portInput.trim(), 10) || 25565;
      const parsed = parseAndCleanServerAddress(formData.host || '', currentPortNum);
      const finalHost = parsed.host || 'play.hypixel.net';
      const finalPort = parsed.hasPort && parsed.port ? parsed.port : currentPortNum;

      const finalDefaults: BotDefaults = {
        ...formData,
        host: finalHost,
        port: finalPort,
        quickCommands:
          formData.quickCommands && formData.quickCommands.length > 0
            ? formData.quickCommands
            : DEFAULT_QUICK_COMMANDS,
      };
      await onSaveDefaults(finalDefaults);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto overscroll-contain">
      <motion.div
        id="bot-defaults-modal"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        className={`border rounded-2xl sm:rounded-3xl w-full max-w-xl max-h-[92dvh] overflow-y-auto shadow-2xl flex flex-col relative my-auto transform-gpu transition-colors ${
          isColourUI
            ? 'bg-[#090e1f] border-indigo-500/30 text-slate-100 shadow-[0_0_35px_rgba(99,102,241,0.25)]'
            : isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 sm:px-6 py-3.5 sm:py-4 border-b flex items-center justify-between sticky top-0 z-20 backdrop-blur-md ${
            isColourUI
              ? 'border-indigo-500/20 bg-[#090e1f]/90'
              : isDark ? 'border-zinc-800 bg-zinc-950/90' : 'border-zinc-200 bg-white/90'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div
              className={`w-8 sm:w-9 h-8 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                isColourUI
                  ? 'bg-indigo-950/60 border-indigo-500/40 text-cyan-300 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                  : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-zinc-100 border-zinc-300 text-zinc-800'
              }`}
            >
              <Sliders className={`w-4 sm:w-5 h-4 sm:h-5 ${isColourUI ? 'text-cyan-400' : ''}`} />
            </div>
            <div>
              <h3 className={`font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-2 ${
                isColourUI ? 'text-white' : isDark ? 'text-white' : 'text-zinc-950'
              }`}>
                Bot Settings & Presets
              </h3>
              <p className={`text-[11px] sm:text-xs ${isColourUI ? 'text-slate-400' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Configure default server, quick chat commands, and anti-AFK
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer ${
              isColourUI
                ? 'text-slate-400 hover:text-white hover:bg-indigo-500/20'
                : isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-4 sm:w-5 h-4 sm:h-5" />
          </motion.button>
        </div>

        {/* Tab Switcher with animated pill */}
        <div className="px-4 sm:px-6 pt-3 sm:pt-4">
          <div
            className={`grid grid-cols-3 p-1 border rounded-2xl relative transition-all duration-300 ${
              isColourUI
                ? `${tabColorConfig[activeTab].containerBorder} ${isDark ? 'bg-zinc-950/70' : 'bg-zinc-100'}`
                : isDark
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-zinc-100 border-zinc-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab('server')}
              className={`py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all duration-300 relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                activeTab === 'server'
                  ? isColourUI
                    ? 'text-sky-300 font-black'
                    : isDark
                    ? 'text-white'
                    : 'text-zinc-950'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Server className={`w-3.5 h-3.5 shrink-0 transition-colors duration-300 ${
                isColourUI || activeTab === 'server' ? 'text-sky-400' : 'text-zinc-400'
              }`} />
              <span className="truncate">Server & Join</span>
              {activeTab === 'server' && (
                <motion.div
                  layoutId="defaults-tab-pill"
                  className={`absolute inset-0 border rounded-xl -z-10 transition-all duration-300 ${
                    isColourUI
                      ? tabColorConfig.server.pill
                      : isDark
                      ? 'bg-zinc-800 border-zinc-700 shadow-xs'
                      : 'bg-white border-zinc-300 shadow-xs'
                  }`}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quick_messages')}
              className={`py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all duration-300 relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                activeTab === 'quick_messages'
                  ? isColourUI
                    ? 'text-purple-300 font-black'
                    : isDark
                    ? 'text-white'
                    : 'text-zinc-950'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 transition-colors duration-300 ${
                isColourUI || activeTab === 'quick_messages' ? 'text-purple-400' : 'text-zinc-400'
              }`} />
              <span className="truncate">Quick Messages</span>
              {activeTab === 'quick_messages' && (
                <motion.div
                  layoutId="defaults-tab-pill"
                  className={`absolute inset-0 border rounded-xl -z-10 transition-all duration-300 ${
                    isColourUI
                      ? tabColorConfig.quick_messages.pill
                      : isDark
                      ? 'bg-zinc-800 border-zinc-700 shadow-xs'
                      : 'bg-white border-zinc-300 shadow-xs'
                  }`}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('antiafk')}
              className={`py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all duration-300 relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                activeTab === 'antiafk'
                  ? isColourUI
                    ? 'text-amber-300 font-black'
                    : isDark
                    ? 'text-white'
                    : 'text-zinc-950'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 shrink-0 transition-colors duration-300 ${
                isColourUI || activeTab === 'antiafk' ? 'text-amber-400' : 'text-zinc-400'
              }`} />
              <span className="truncate">Anti-AFK</span>
              {activeTab === 'antiafk' && (
                <motion.div
                  layoutId="defaults-tab-pill"
                  className={`absolute inset-0 border rounded-xl -z-10 transition-all duration-300 ${
                    isColourUI
                      ? tabColorConfig.antiafk.pill
                      : isDark
                      ? 'bg-zinc-800 border-zinc-700 shadow-xs'
                      : 'bg-white border-zinc-300 shadow-xs'
                  }`}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content with smooth AnimatePresence */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs flex-1 flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {activeTab === 'server' && (
              <motion.div
                key="tab-server"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Server Connection Defaults */}
                <div
                  className={`border rounded-2xl p-4 space-y-3 ${
                    isColourUI
                      ? 'bg-[#060a16] border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.08)]'
                      : isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <h4
                    className={`font-bold uppercase tracking-wider flex items-center gap-2 text-[11px] ${
                      isColourUI ? 'text-sky-300' : isDark ? 'text-zinc-200' : 'text-zinc-800'
                    }`}
                  >
                    <Server className={`w-4 h-4 ${isColourUI ? 'text-sky-400' : 'text-zinc-400'}`} />
                    Default Minecraft Server
                  </h4>

                  <div className="space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label
                          className={`block text-[11px] font-medium mb-1 ${
                            isColourUI ? 'text-sky-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
                          }`}
                        >
                          Default Server Host / Domain / IP
                        </label>
                        <input
                          type="text"
                          value={formData.host}
                          onChange={(e) => handleHostInput(e.target.value)}
                          onBlur={(e) => handleHostInput(e.target.value, true)}
                          placeholder="e.g. yourserver.aternos.me:15087 or mc.hypixel.net"
                          required
                          className={`w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-all ${
                            isColourUI
                              ? 'bg-[#090e1f] border-slate-700 text-white focus:border-sky-400'
                              : isDark
                              ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500'
                              : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                          }`}
                        />
                      </div>

                      <div>
                        <label
                          className={`block text-[11px] font-medium mb-1 ${
                            isColourUI ? 'text-sky-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
                          }`}
                        >
                          Default Port
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={portInput}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setPortInput(val);
                          }}
                          placeholder="25565"
                          required
                          className={`w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-all ${
                            isColourUI
                              ? 'bg-[#090e1f] border-slate-700 text-white focus:border-sky-400'
                              : isDark
                              ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500'
                              : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                          }`}
                        />
                      </div>
                    </div>
                    {/* Smart Notice Feedback */}
                    {smartNotice && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono animate-fade-in ${
                        isColourUI
                          ? 'bg-sky-950/30 border-sky-500/30 text-sky-300'
                          : isDark
                          ? 'bg-zinc-900 border-zinc-700 text-zinc-300'
                          : 'bg-zinc-100 border-zinc-300 text-zinc-800'
                      }`}>
                        <span>{smartNotice}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label
                        className={`block text-[11px] font-medium mb-1 ${
                          isColourUI ? 'text-sky-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
                        }`}
                      >
                        Default Auth Type
                      </label>
                      <select
                        value={formData.auth}
                        onChange={(e) => setFormData({ ...formData, auth: e.target.value as any })}
                        className={`w-full border rounded-xl px-3 py-2 text-xs cursor-pointer focus:outline-none transition-all ${
                          isColourUI
                            ? 'bg-[#090e1f] border-slate-700 text-white focus:border-sky-400'
                            : isDark
                            ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                        }`}
                      >
                        <option value="offline">Offline / Cracked (Free & Universal)</option>
                        <option value="microsoft">Microsoft / Mojang (Online Mode)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        className={`block text-[11px] font-medium mb-1 ${
                          isColourUI ? 'text-sky-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
                        }`}
                      >
                        Default Version (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.version || ''}
                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                        placeholder="Leave empty for Auto-Detect"
                        className={`w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-all ${
                          isColourUI
                            ? 'bg-[#090e1f] border-slate-700 text-white focus:border-sky-400'
                            : isDark
                            ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* On-Join Command Automation */}
                <div
                  className={`border rounded-2xl p-4 space-y-3 ${
                    isColourUI
                      ? 'bg-[#060a16] border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.08)]'
                      : isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <h4
                    className={`font-bold uppercase tracking-wider flex items-center gap-2 text-[11px] ${
                      isColourUI ? 'text-sky-300' : isDark ? 'text-zinc-200' : 'text-zinc-800'
                    }`}
                  >
                    <Terminal className={`w-4 h-4 ${isColourUI ? 'text-sky-400' : 'text-zinc-400'}`} />
                    Default On-Join Automation
                  </h4>

                  <div>
                    <label
                      className={`block text-[11px] font-medium mb-1 ${
                        isColourUI ? 'text-sky-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
                      }`}
                    >
                      Default On-Join Chat / Command
                    </label>
                    <input
                      type="text"
                      value={formData.onJoinCommand || ''}
                      onChange={(e) => setFormData({ ...formData, onJoinCommand: e.target.value })}
                      placeholder="e.g. /login mypassword or /server survival"
                      className={`w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-all ${
                        isColourUI
                          ? 'bg-[#090e1f] border-slate-700 text-white focus:border-sky-400'
                          : isDark
                          ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500'
                          : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                      }`}
                    />
                    <p className={`text-[10px] mt-1 ${isColourUI ? 'text-slate-400' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Pre-fills when creating new bot profiles. Can always be overridden per bot.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label
                        className={`block text-[11px] font-medium mb-1 ${
                          isColourUI ? 'text-sky-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
                        }`}
                      >
                        Execution Delay (Milliseconds)
                      </label>
                      <input
                        type="number"
                        value={formData.onJoinDelayMs || 2000}
                        onChange={(e) =>
                          setFormData({ ...formData, onJoinDelayMs: parseInt(e.target.value, 10) || 2000 })
                        }
                        min={500}
                        step={250}
                        className={`w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-all ${
                          isColourUI
                            ? 'bg-[#090e1f] border-slate-700 text-white focus:border-sky-400'
                            : isDark
                            ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                        }`}
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-[11px] font-medium mb-1 ${
                          isColourUI ? 'text-sky-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
                        }`}
                      >
                        Default Auto-Reconnect Delay (Seconds)
                      </label>
                      <input
                        type="number"
                        value={formData.reconnectDelaySeconds || 5}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            reconnectDelaySeconds: parseInt(e.target.value, 10) || 5,
                          })
                        }
                        min={2}
                        max={60}
                        className={`w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-all ${
                          isColourUI
                            ? 'bg-[#090e1f] border-slate-700 text-white focus:border-sky-400'
                            : isDark
                            ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'quick_messages' && (
              <motion.div
                key="tab-quick-messages"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Quick Messages Editor */}
                <div
                  className={`border rounded-2xl p-4 space-y-3 ${
                    isColourUI
                      ? 'bg-[#060a16] border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.08)]'
                      : isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4
                        className={`font-bold uppercase tracking-wider flex items-center gap-2 text-[11px] ${
                          isColourUI ? 'text-purple-300' : isDark ? 'text-zinc-200' : 'text-zinc-800'
                        }`}
                      >
                        <MessageSquare className={`w-4 h-4 ${isColourUI ? 'text-purple-400' : 'text-zinc-400'}`} />
                        Custom Quick Messages & Commands
                      </h4>
                      <p className={`text-[10px] mt-0.5 ${isColourUI ? 'text-purple-300/70' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        These buttons appear below the live console chat for 1-tap sending.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetQuickCommands}
                      className={`text-[10px] flex items-center gap-1 transition-colors cursor-pointer ${
                        isColourUI ? 'text-purple-400 hover:text-purple-200' : isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Defaults</span>
                    </button>
                  </div>

                  {/* Add New Command Form */}
                  <div
                    className={`p-3 border rounded-xl space-y-2 ${
                      isColourUI
                        ? 'bg-[#090e1f] border-purple-500/20'
                        : isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                        isColourUI ? 'text-purple-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
                      }`}
                    >
                      <Plus className={`w-3.5 h-3.5 ${isColourUI ? 'text-purple-400' : 'text-zinc-400'}`} />
                      Add New Quick Message / Command:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        type="text"
                        value={newCmdLabel}
                        onChange={(e) => setNewCmdLabel(e.target.value)}
                        placeholder="Button Label (e.g. /afk or GG)"
                        className={`sm:col-span-4 border rounded-lg px-2.5 py-1.5 font-mono text-xs focus:outline-none ${
                          isColourUI
                            ? 'bg-[#060a16] border-slate-700 text-white focus:border-purple-400'
                            : isDark
                            ? 'bg-zinc-950 border-zinc-800 text-white focus:border-zinc-500'
                            : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-600'
                        }`}
                      />
                      <input
                        type="text"
                        value={newCmdText}
                        onChange={(e) => setNewCmdText(e.target.value)}
                        placeholder="Message/Command (e.g. /afk or Good game!)"
                        className={`sm:col-span-6 border rounded-lg px-2.5 py-1.5 font-mono text-xs focus:outline-none ${
                          isColourUI
                            ? 'bg-[#060a16] border-slate-700 text-white focus:border-purple-400'
                            : isDark
                            ? 'bg-zinc-950 border-zinc-800 text-white focus:border-zinc-500'
                            : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-600'
                        }`}
                      />
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={handleAddQuickCommand}
                        disabled={!newCmdLabel.trim() || !newCmdText.trim()}
                        className={`sm:col-span-2 px-3 py-1.5 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-all cursor-pointer border shadow-xs disabled:opacity-40 ${
                          isColourUI
                            ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 disabled:bg-purple-950 disabled:text-purple-400'
                            : isDark
                            ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-white disabled:bg-zinc-800 disabled:text-zinc-600'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900 disabled:bg-zinc-200 disabled:text-zinc-400'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Existing Quick Messages List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {(formData.quickCommands || []).map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2.5 border rounded-xl gap-2 transition-colors ${
                          isColourUI
                            ? 'bg-[#090e1f] border-slate-700 hover:border-purple-500/50'
                            : isDark
                            ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                            : 'bg-white border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        {editingCmdId === item.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editCmdLabel}
                              onChange={(e) => setEditCmdLabel(e.target.value)}
                              className={`w-28 border rounded-lg px-2 py-1 font-mono text-xs focus:outline-none ${
                                isColourUI ? 'bg-[#060a16] border-purple-400 text-white' : isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                              }`}
                            />
                            <input
                              type="text"
                              value={editCmdText}
                              onChange={(e) => setEditCmdText(e.target.value)}
                              className={`flex-1 border rounded-lg px-2 py-1 font-mono text-xs focus:outline-none ${
                                isColourUI ? 'bg-[#060a16] border-purple-400 text-white' : isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditQuickCommand(item.id)}
                              className={`p-1 rounded-md cursor-pointer border ${
                                isColourUI ? 'bg-purple-500 text-white border-purple-300' : isDark ? 'bg-zinc-100 text-zinc-950 border-white' : 'bg-zinc-900 text-white border-zinc-900'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCmdId(null)}
                              className={`p-1 rounded-md cursor-pointer border ${
                                isColourUI ? 'bg-slate-800 text-slate-300 border-slate-700' : isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-100 text-zinc-600 border-zinc-300'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`px-2.5 py-1 rounded-full border text-xs font-mono font-bold shrink-0 ${
                                  isColourUI
                                    ? 'bg-purple-950/60 border-purple-500/60 text-purple-200'
                                    : isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-zinc-100 border-zinc-300 text-zinc-800'
                                }`}
                              >
                                {item.label}
                              </span>
                              <span
                                className={`font-mono text-[11px] truncate ${
                                  isColourUI ? 'text-purple-300/80' : isDark ? 'text-zinc-400' : 'text-zinc-600'
                                }`}
                              >
                                → {item.cmd}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditQuickCommand(item)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isColourUI
                                    ? 'text-purple-400 hover:text-white hover:bg-purple-950/60'
                                    : isDark
                                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                                }`}
                                title="Edit Command"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuickCommand(item.id)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isColourUI
                                    ? 'text-rose-400 hover:text-rose-200 hover:bg-rose-950/50'
                                    : isDark
                                    ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30'
                                    : 'text-zinc-500 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title="Delete Command"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Live Preview Bar */}
                  <div className={`pt-2 border-t ${isColourUI ? 'border-purple-500/20' : isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <span className={`text-[10px] uppercase font-bold block mb-1.5 ${isColourUI ? 'text-purple-400' : 'text-zinc-500'}`}>
                      Console Bar Preview:
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {(formData.quickCommands || []).map((q) => (
                        <span
                          key={q.id}
                          className={`shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-mono whitespace-nowrap font-medium ${
                            isColourUI
                              ? 'bg-purple-950/60 border-purple-500/60 text-purple-200 shadow-xs'
                              : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-300 text-zinc-700'
                          }`}
                        >
                          {q.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'antiafk' && (
              <motion.div
                key="tab-antiafk"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Anti-AFK Defaults */}
                <div
                  className={`border rounded-2xl p-4 space-y-3 ${
                    isColourUI
                      ? 'bg-[#060a16] border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                      : isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-bold uppercase tracking-wider flex items-center gap-2 text-[11px] ${
                        isColourUI ? 'text-amber-300' : isDark ? 'text-zinc-200' : 'text-zinc-800'
                      }`}
                    >
                      <Zap className={`w-4 h-4 ${isColourUI ? 'text-amber-400' : isDark ? 'text-amber-400' : 'text-black'}`} />
                      Default Anti-AFK Routine
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.antiAfk.enabled}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            antiAfk: { ...formData.antiAfk, enabled: e.target.checked },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className={`w-8 h-4 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${
                        isColourUI
                          ? 'bg-slate-800 peer-checked:bg-amber-500 after:border-slate-700'
                          : isDark ? 'bg-zinc-800 peer-checked:bg-zinc-200 after:border-zinc-700' : 'bg-zinc-300 peer-checked:bg-zinc-900 after:border-zinc-400'
                      }`} />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        className={`block text-[11px] font-medium mb-1 ${
                          isColourUI ? 'text-amber-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
                        }`}
                      >
                        Movement Routine
                      </label>
                      <select
                        value={formData.antiAfk.movementType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            antiAfk: { ...formData.antiAfk, movementType: e.target.value as any },
                          })
                        }
                        className={`w-full border rounded-xl px-3 py-2 text-xs cursor-pointer focus:outline-none transition-all ${
                          isColourUI
                            ? 'bg-[#090e1f] border-slate-700 text-white focus:border-amber-400'
                            : isDark
                            ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                        }`}
                      >
                        <option value="safe_in_place">🛡️ Safe In-Place (Anti-Cheat / Paper / Aternos Safe)</option>
                        <option value="strafe_lr">Strafe Left & Right (Position Locked)</option>
                        <option value="jump_strafe">Jump + Strafe (Heavy AFK Detectors)</option>
                        <option value="full_routine">Full Routine (Strafe, Look, Swing)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        className={`block text-[11px] font-medium mb-1 ${
                          isColourUI ? 'text-amber-300' : isDark ? 'text-zinc-300' : 'text-zinc-700'
                        }`}
                      >
                        Default Interval (Seconds)
                      </label>
                      <input
                        type="number"
                        value={formData.antiAfk.intervalSeconds}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            antiAfk: {
                              ...formData,
                              intervalSeconds: Math.max(5, parseInt(e.target.value, 10) || 30),
                            },
                          })
                        }
                        min={5}
                        max={300}
                        className={`w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-all ${
                          isColourUI
                            ? 'bg-[#090e1f] border-slate-700 text-white focus:border-amber-400'
                            : isDark
                            ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500'
                            : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between pt-3 gap-2 sm:gap-3 border-t ${
              isColourUI ? 'border-slate-800' : isDark ? 'border-zinc-800' : 'border-zinc-200'
            }`}
          >
            <button
              type="button"
              onClick={handleResetFactory}
              className={`px-3 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border text-xs ${
                isColourUI
                  ? 'bg-[#070d1a] hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                  : isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 border-zinc-300'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Reset All Defaults</span>
            </button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-xs border ${
                isColourUI
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 border-emerald-300/80 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                  : isDark
                  ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-white shadow-zinc-950/40'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900 shadow-zinc-900/20'
              } disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-950 animate-bounce" />
                  <span>Settings Saved!</span>
                </>
              ) : isSaving ? (
                <span className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-950 rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save All Settings</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

