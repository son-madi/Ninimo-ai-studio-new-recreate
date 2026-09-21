import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Rocket,
  Server,
  Hash,
  AlertCircle,
  CheckCircle2,
  Square,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { BotState, User } from '../types';
import { parseAndCleanServerAddress } from '../utils/serverAddress';

interface TesterSwarmCommanderProps {
  currentUser: User;
  token: string;
  bots: BotState[];
  onRefresh: () => void;
}

export const TesterSwarmCommander: React.FC<TesterSwarmCommanderProps> = ({
  currentUser,
  token,
  bots,
  onRefresh,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [count, setCount] = useState<number>(8);
  const [baseName, setBaseName] = useState<string>('Ninimo');
  const [host, setHost] = useState<string>('play.hypixel.net');
  const [portInput, setPortInput] = useState<string>('25565');
  const [smartNotice, setSmartNotice] = useState<string | null>(null);
  const [version, setVersion] = useState<string>('');
  const [auth, setAuth] = useState<'offline' | 'microsoft'>('offline');
  const [onJoinCommand, setOnJoinCommand] = useState<string>('');
  const [autoStart, setAutoStart] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generate preview of sequential names
  const previewNames = Array.from({ length: Math.min(count || 1, 5) }).map(
    (_, i) => `${baseName.trim() || 'Ninimo'}${i + 1}`
  );
  const overflowCount = (count || 1) - previewNames.length;

  const handleHostInput = (rawVal: string, isBlur = false) => {
    const currentPortNum = parseInt(portInput.trim(), 10) || 25565;
    const parsed = parseAndCleanServerAddress(rawVal, currentPortNum);

    if (parsed.hasPort && parsed.port) {
      setPortInput(String(parsed.port));
      setHost(parsed.host);
      setSmartNotice(`Auto-filled port: ${parsed.port}`);
    } else if (isBlur && parsed.corrections.length > 0) {
      setHost(parsed.host);
      setSmartNotice(`✨ Auto-corrected: ${parsed.corrections.join(', ')}`);
    } else {
      setHost(parsed.host);
      if (parsed.corrections.length > 0) {
        setSmartNotice(`✨ ${parsed.corrections[0]}`);
      } else if (!isBlur) {
        setSmartNotice(null);
      }
    }
  };

  const handleLaunchSwarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsLoading(true);

    try {
      const currentPortNum = parseInt(portInput.trim(), 10) || 25565;
      const parsed = parseAndCleanServerAddress(host, currentPortNum);
      const finalHost = parsed.host || 'play.hypixel.net';
      const finalPort = parsed.hasPort && parsed.port ? parsed.port : currentPortNum;

      const res = await fetch('/api/bots/swarm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          count,
          baseName: baseName.trim() || 'Ninimo',
          host: finalHost,
          port: finalPort,
          version: version.trim(),
          auth,
          onJoinCommand: onJoinCommand.trim(),
          autoStart,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to spawn bot swarm');
      }

      setStatusMessage({
        type: 'success',
        text: `Swarm deployed! Successfully initialized ${data.count} bots (${baseName}1 to ${baseName}${data.count}) connecting to ${finalHost}:${finalPort}.`,
      });
      onRefresh();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error occurred while deploying swarm',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurgeSwarm = async () => {
    if (!confirm('Purge all swarm bots from memory and background tasks? This will instantly free engine resources.')) return;
    try {
      const res = await fetch('/api/bots/swarm/purge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStatusMessage({
        type: 'success',
        text: data.message || 'Purged all swarm bots successfully.',
      });
      onRefresh();
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e?.message || 'Failed to purge swarm' });
    }
  };

  const handleStopAll = async () => {
    if (!confirm('Stop all running bots for this account?')) return;
    try {
      await fetch('/api/bots/stop-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      onRefresh();
    } catch {}
  };

  const handleDeleteAll = async () => {
    if (!confirm('Delete all bots in this account? This cannot be undone.')) return;
    try {
      await fetch('/api/bots/delete-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      onRefresh();
    } catch {}
  };

  const quickCounts = [2, 4, 8, 12, 16, 20];
  const isHypixelOffline = host.toLowerCase().includes('hypixel') && auth === 'offline';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-indigo-950/40 border border-indigo-500/30 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden mb-6"
    >
      {/* Background glow sheen */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Multi-Bot Swarm Commander
              </h2>
              <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                TESTER EXCLUSIVE
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Spawn and mass-connect sequential Minecraft bots to any server simultaneously.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePurgeSwarm}
            className="px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-700/50"
            title="Purge all background swarm bots to free memory and connection slots"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Purge Swarm</span>
          </button>

          {bots.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleStopAll}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-zinc-700"
                title="Stop all running bots"
              >
                <Square className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Stop All</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-rose-800/40"
                title="Clear all bots"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Fleet</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
            aria-label="Toggle Swarm Panel"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleLaunchSwarm}
            className="mt-5 space-y-4"
          >
            {/* Status notification */}
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 font-medium border ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{statusMessage.text}</span>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Bot Count Box */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-indigo-400" />
                    Number of Bots
                  </span>
                  <span className="text-[11px] font-mono text-indigo-300 font-bold">
                    {count} Bots
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(25, Number(e.target.value) || 1)))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50"
                  required
                />
                {/* Quick Select Pill Buttons */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {quickCounts.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCount(val)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold transition-all ${
                        count === val
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Base Bot Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Base Bot Name
                </label>
                <input
                  type="text"
                  value={baseName}
                  onChange={(e) => setBaseName(e.target.value)}
                  placeholder="Ninimo"
                  maxLength={12}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50"
                  required
                />
                <div className="mt-1 text-[10px] text-zinc-400 truncate">
                  Preview:{' '}
                  <span className="font-mono text-emerald-400">
                    {previewNames.join(', ')}
                    {overflowCount > 0 ? `, +${overflowCount} more` : ''}
                  </span>
                </div>
              </div>

              {/* Server Host & Port */}
              <div className="space-y-1.5 lg:col-span-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-teal-400" />
                      Target Server IP / Domain
                    </label>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => handleHostInput(e.target.value)}
                      onBlur={(e) => handleHostInput(e.target.value, true)}
                      placeholder="play.hypixel.net or aternos.me"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 font-mono transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Port
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
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 font-mono transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Quick Server Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-zinc-400">Quick fill:</span>
                  <button
                    type="button"
                    onClick={() => { setHost('127.0.0.1'); setPortInput('25565'); }}
                    className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono transition-colors"
                  >
                    Localhost:25565
                  </button>
                  <button
                    type="button"
                    onClick={() => { setHost('play.hypixel.net'); setPortInput('25565'); setAuth('microsoft'); }}
                    className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono transition-colors"
                  >
                    Hypixel (Microsoft)
                  </button>
                </div>

                {/* Smart Notice Feedback */}
                {smartNotice && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono animate-fade-in bg-zinc-900 border-zinc-700 text-zinc-300">
                    <span>{smartNotice}</span>
                  </div>
                )}

                {/* Hypixel Offline Warning */}
                {isHypixelOffline && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl border text-[11px] bg-amber-950/40 border-amber-500/40 text-amber-200 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <span className="font-bold">Notice for Hypixel:</span> Hypixel requires official paid Minecraft accounts and blocks offline/cracked bots. To test swarm bots offline, connect to an offline-mode server (such as Falix, Aternos offline, or a local LAN test server), or switch Auth to Microsoft.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Secondary Advanced Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Optional On-Join Command */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-zinc-500" />
                  On-Join Command (Optional)
                </label>
                <input
                  type="text"
                  value={onJoinCommand}
                  onChange={(e) => setOnJoinCommand(e.target.value)}
                  placeholder="e.g. /register pass123 pass123"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 font-mono"
                />
              </div>

              {/* Version dropdown */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Minecraft Version
                </label>
                <select
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/80"
                >
                  <option value="">Auto-Detect Protocol</option>
                  <option value="1.20.4">1.20.4</option>
                  <option value="1.20.2">1.20.2</option>
                  <option value="1.20.1">1.20.1</option>
                  <option value="1.19.4">1.19.4</option>
                  <option value="1.18.2">1.18.2</option>
                  <option value="1.16.5">1.16.5</option>
                  <option value="1.12.2">1.12.2</option>
                  <option value="1.8.9">1.8.9</option>
                </select>
              </div>

              {/* Auth Mode & Auto-start */}
              <div className="flex items-center gap-4 pt-4 sm:pt-6">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoStart}
                    onChange={(e) => setAutoStart(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-indigo-500 focus:ring-indigo-400"
                  />
                  <span>Auto-Start Staggered</span>
                </label>

                <div className="flex items-center gap-2 text-xs text-zinc-400 ml-auto">
                  <span className="text-[11px] font-mono">Offline (Cracked)</span>
                </div>
              </div>
            </div>

            {/* Launch Swarm Action Button */}
            <div className="pt-2 flex items-center justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-950/60 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deploying Swarm Fleet ({count} Bots)...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    <span>Launch Multi-Bot Swarm ({count} Bots)</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
