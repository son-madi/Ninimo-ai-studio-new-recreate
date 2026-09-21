import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Send,
  Terminal,
  Trash2,
  Download,
  Command,
  MessageSquare,
  Sliders,
} from 'lucide-react';
import { ChatMessage, QuickCommandItem } from '../types';
import { useTheme } from '../context/ThemeContext';

interface ChatConsoleProps {
  chatHistory: ChatMessage[];
  botUsername: string;
  isOnline: boolean;
  botStatus?: string;
  quickCommands?: QuickCommandItem[];
  onSendMessage?: (message: string) => Promise<boolean> | void;
  onSendChat?: (message: string) => Promise<boolean> | void;
  onClearChat?: () => void;
  onOpenQuickMessagesSettings?: () => void;
  embedded?: boolean;
}

export const ChatConsole: React.FC<ChatConsoleProps> = ({
  chatHistory,
  botUsername,
  isOnline,
  botStatus,
  quickCommands,
  onSendMessage,
  onSendChat,
  onClearChat,
  onOpenQuickMessagesSettings,
  embedded = false,
}) => {
  const { theme, isDark, isColourUI } = useTheme();

  const [inputText, setInputText] = useState('');
  const [filter, setFilter] = useState<'all' | 'chat' | 'system'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canSend = isOnline || botStatus === 'starting';

  const dispatchSendMessage = async (msg: string) => {
    if (onSendMessage) {
      return await onSendMessage(msg);
    }
    if (onSendChat) {
      return await onSendChat(msg);
    }
    return false;
  };

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const msg = inputText.trim();
    setIsSending(true);
    setInputText('');

    try {
      await dispatchSendMessage(msg);
    } finally {
      setIsSending(false);
    }
  };

  const sendQuickCommand = (cmd: string) => {
    dispatchSendMessage(cmd);
  };

  const filteredHistory = chatHistory.filter((msg) => {
    if (filter === 'all') return true;
    if (filter === 'chat') return msg.type === 'chat' || msg.type === 'whisper' || msg.type === 'bot_sent';
    if (filter === 'system') return msg.type === 'system' || msg.type === 'info' || msg.type === 'error';
    return true;
  });

  const defaultQuickCommands: QuickCommandItem[] = [
    { id: '1', label: '/spawn', cmd: '/spawn' },
    { id: '2', label: '/home', cmd: '/home' },
    { id: '3', label: '/list', cmd: '/list' },
    { id: '4', label: '/help', cmd: '/help' },
    { id: '5', label: '/ping', cmd: '/ping' },
    { id: '6', label: 'Hello!', cmd: 'Hello everyone!' },
  ];

  const activeQuickCommands = quickCommands && quickCommands.length > 0 ? quickCommands : defaultQuickCommands;

  const handleDownloadChat = () => {
    if (chatHistory.length === 0) return;
    const lines = chatHistory.map((msg) => {
      const time = new Date(msg.timestamp).toLocaleString();
      const sender = msg.sender ? `[${msg.sender}]` : '';
      const type = msg.type ? `[${msg.type.toUpperCase()}]` : '';
      return `${time} ${type} ${sender} ${msg.text}`.trim();
    });
    const textContent = lines.join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const botNameSafe = (botUsername || 'minecraft_bot').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `${botNameSafe}-chat-${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="chat-console" className={`border rounded-2xl flex flex-col h-[520px] shadow-xl overflow-hidden transition-colors ${
      isColourUI
        ? 'bg-[#090e1f] border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.15)]'
        : isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
    }`}>
      {/* Header */}
      <div className={`p-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
        isColourUI
          ? 'bg-[#060a16] border-indigo-500/20'
          : isDark ? 'bg-zinc-950/90 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
      }`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
            isColourUI
              ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
              : isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-300 text-zinc-800'
          }`}>
            <Terminal className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <h3 className={`font-bold text-xs truncate ${
              isColourUI ? 'text-indigo-100' : isDark ? 'text-white' : 'text-zinc-900'
            }`}>
              Minecraft Live Chat & Console
            </h3>
            {isOnline ? (
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold border px-2 py-0.5 rounded-full shrink-0 ${
                isColourUI
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : isDark
                  ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                  : 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isColourUI ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-white shadow-xs'
                }`} />
                ONLINE
              </span>
            ) : botStatus === 'starting' ? (
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                isColourUI
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                  : 'text-sky-400 bg-sky-500/15 border border-sky-500/30'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-spin" />
                CONNECTING...
              </span>
            ) : (
              <span className={`text-[10px] font-medium shrink-0 ${isColourUI ? 'text-slate-500' : 'text-zinc-500'}`}>OFFLINE</span>
            )}
          </div>
        </div>

        {/* Filter buttons and Clear action */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto">
          <div className={`flex items-center border rounded-xl p-1 text-[11px] relative ${
            isColourUI
              ? 'bg-[#040711] border-slate-800'
              : isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
          }`}>
            {(['all', 'chat', 'system'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded-lg capitalize font-semibold transition-colors relative z-10 cursor-pointer ${
                  filter === tab
                    ? isColourUI
                      ? 'text-white'
                      : isDark ? 'text-white' : 'text-zinc-950'
                    : isColourUI
                    ? 'text-slate-400 hover:text-slate-200'
                    : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {tab}
                {filter === tab && (
                  <motion.div
                    layoutId="chat-filter-tab"
                    className={`absolute inset-0 border rounded-lg -z-10 ${
                      isColourUI
                        ? 'bg-indigo-600/30 border-indigo-400/50 shadow-[0_0_10px_rgba(99,102,241,0.25)]'
                        : isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-300 shadow-sm'
                    }`}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <motion.button
              id="btn-download-chat-console"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownloadChat}
              disabled={chatHistory.length === 0}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                isColourUI
                  ? 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-white border-indigo-500/30 hover:border-indigo-400'
                  : isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-black border-zinc-200 hover:border-zinc-300'
              }`}
              title="Download Chat History (.txt)"
              aria-label="Download Chat"
            >
              <Download className={`w-3.5 h-3.5 shrink-0 ${isColourUI ? 'text-indigo-400' : 'text-zinc-400'}`} />
              <span className="text-[11px] font-medium">Download</span>
            </motion.button>

            <motion.button
              id="btn-clear-chat-console"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onClearChat && onClearChat()}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                isColourUI
                  ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white border-rose-500/30 hover:border-rose-400'
                  : isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-black border-zinc-200 hover:border-zinc-300'
              }`}
              title="Clear Console History"
              aria-label="Clear Console"
            >
              <Trash2 className={`w-3.5 h-3.5 shrink-0 ${isColourUI ? 'text-rose-400' : 'text-zinc-400'}`} />
              <span className="text-[11px] font-medium">Clear</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`flex-1 p-4 overflow-y-auto overflow-x-auto space-y-1.5 font-mono text-xs select-text ${
          isColourUI
            ? 'bg-[#050814]/80 text-slate-200'
            : isDark ? 'bg-zinc-950/70 text-zinc-200' : 'bg-zinc-50/70 text-zinc-800'
        }`}
      >
        {filteredHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs gap-2">
            <MessageSquare className={`w-8 h-8 ${isColourUI ? 'text-indigo-400/50' : 'text-zinc-400'}`} />
            <p className={isColourUI ? 'text-indigo-300/60' : 'text-zinc-500'}>No chat messages received yet</p>
          </div>
        ) : (
          filteredHistory.map((msg) => {
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            let displaySender = msg.sender;
            let displayText = msg.text || '';

            // Cleanly strip any duplicated/nested sender prefixes (e.g. "<Narendra_modi> Hey", "<Narendra_modi> <Narendra_modi> hey", "[Narendra_modi] hey", "Narendra_modi: hey")
            if (!msg.isAuto) {
              let prevText = '';
              while (displayText !== prevText && displayText.length > 0) {
                prevText = displayText;
                const bracketMatch = displayText.match(/^[<\[\(]([A-Za-z0-9_.~*]{1,24})[>\]\)]\s*:?\s*(.*)$/);
                if (bracketMatch) {
                  if (!displaySender) {
                    displaySender = bracketMatch[1];
                  }
                  displayText = bracketMatch[2];
                  continue;
                }
                const colonMatch = displayText.match(/^([A-Za-z0-9_.~*]{1,24})\s*[:>]\s+(.*)$/);
                if (colonMatch && colonMatch[1].toLowerCase() !== 'auto') {
                  if (!displaySender) {
                    displaySender = colonMatch[1];
                  }
                  displayText = colonMatch[2];
                  continue;
                }
              }

              // Also thoroughly strip any repeated sender or bot name occurrences at the start of displayText
              const namesToCheck = [displaySender, botUsername].filter(Boolean) as string[];
              for (const name of namesToCheck) {
                const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const nameRegex = new RegExp(`^([<\\[\\(]?${escaped}[>\\]\\)]?\\s*[:>\\-]?\\s*)+`, 'i');
                displayText = displayText.replace(nameRegex, '').trim();
              }

              if (!displayText.trim() && prevText) {
                displayText = prevText;
              }
            }

            const isBotSelf =
              msg.type === 'bot_sent' ||
              ((msg.type === 'chat' || msg.type === 'whisper') &&
                Boolean(displaySender) &&
                displaySender.toLowerCase() === botUsername.toLowerCase());
            const isOtherPlayer = (msg.type === 'chat' || msg.type === 'whisper') && !isBotSelf && Boolean(displaySender);
            const isSystem = msg.type === 'system' || msg.type === 'info';
            const isError = msg.type === 'error';

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className={`py-1 px-2.5 rounded-lg flex items-center gap-2 transition-colors min-w-full w-max whitespace-nowrap shrink-0 ${
                  isBotSelf
                    ? isColourUI
                      ? 'bg-indigo-950/40 border-l-2 border-indigo-400'
                      : isDark ? 'bg-zinc-800/80 border-l-2 border-zinc-400' : 'bg-zinc-200/80 border-l-2 border-zinc-700'
                    : isOtherPlayer
                    ? isColourUI
                      ? 'bg-sky-950/30 border-l-2 border-cyan-400 shadow-xs'
                      : isDark ? 'bg-zinc-900 border-l-2 border-zinc-300' : 'bg-white border-l-2 border-zinc-800 shadow-sm'
                    : isError
                    ? isColourUI
                      ? 'bg-rose-950/30 border-l-2 border-rose-500 text-rose-300'
                      : 'bg-rose-950/20 border-l-2 border-rose-500 text-rose-400'
                    : isSystem
                    ? isColourUI ? 'text-slate-400' : 'text-zinc-500'
                    : isColourUI ? 'text-slate-300' : 'text-zinc-300'
                }`}
              >
                {/* Timestamp */}
                <span className={`text-[10px] shrink-0 select-none font-mono whitespace-nowrap ${
                  isColourUI ? 'text-slate-500' : 'text-zinc-500'
                }`}>
                  [{timeStr}]
                </span>

                {/* Sender badge strictly for bot chat or player chat */}
                {isBotSelf ? (
                  <span className={`font-bold shrink-0 flex items-center gap-1.5 font-mono whitespace-nowrap ${
                    isColourUI ? 'text-indigo-300' : isDark ? 'text-zinc-200' : 'text-zinc-900'
                  }`}>
                    <span>&lt;{botUsername}&gt;</span>
                    {msg.isAuto && (
                      <span
                        id="chat-console-auto-badge"
                        className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 dark:text-amber-300 border border-amber-500/40 select-none"
                      >
                        [Auto]
                      </span>
                    )}
                  </span>
                ) : isOtherPlayer ? (
                  <span className={`font-bold shrink-0 font-mono whitespace-nowrap ${
                    isColourUI ? 'text-cyan-300' : isDark ? 'text-white' : 'text-zinc-900'
                  }`}>
                    &lt;{displaySender || 'Player'}&gt;
                  </span>
                ) : null}

                {/* Content - full single-line without wrapping, scrollable side-to-side */}
                <div
                  className={`shrink-0 whitespace-nowrap leading-relaxed font-mono ${
                    isBotSelf
                      ? isColourUI ? 'text-indigo-100' : isDark ? 'text-zinc-100' : 'text-zinc-900'
                      : isOtherPlayer
                      ? isColourUI ? 'text-cyan-100' : isDark ? 'text-zinc-200' : 'text-zinc-900'
                      : isColourUI ? 'text-slate-300' : isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  {msg.formattedHtml && !isOtherPlayer && !isBotSelf && displayText === msg.text ? (
                    <span
                      dangerouslySetInnerHTML={{ __html: msg.formattedHtml }}
                      className="whitespace-nowrap inline-block"
                    />
                  ) : (
                    <span className="whitespace-nowrap inline-block">{displayText}</span>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Quick Command Pills */}
      <div className={`px-3 py-2 border-t flex items-center gap-1.5 overflow-x-auto no-scrollbar ${
        isColourUI
          ? 'bg-[#060a16] border-indigo-500/20'
          : isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
      }`}>
        <span className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 shrink-0 ${
          isColourUI ? 'text-cyan-400' : 'text-zinc-500'
        }`}>
          <Command className={`w-3 h-3 ${isColourUI ? 'text-cyan-400' : 'text-zinc-400'}`} />
          Quick:
        </span>
        {activeQuickCommands.map((q) => (
          <motion.button
            key={q.id || q.cmd}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendQuickCommand(q.cmd)}
            disabled={!canSend}
            className={`shrink-0 px-3 py-1 rounded-full border text-[11px] font-mono font-medium transition-all cursor-pointer whitespace-nowrap shadow-xs disabled:opacity-40 ${
              isColourUI
                ? 'bg-[#0f172a] hover:bg-cyan-950/60 text-cyan-200 hover:text-white border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700'
                : 'bg-white hover:bg-zinc-100 text-zinc-800 hover:text-zinc-950 border-zinc-300 hover:border-zinc-400'
            }`}
          >
            {q.label}
          </motion.button>
        ))}

        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {onOpenQuickMessagesSettings && (
            <motion.button
              whileHover={{ scale: 1.12, rotate: 45 }}
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onOpenQuickMessagesSettings}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                isColourUI
                  ? 'text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/50'
                  : isDark ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
              }`}
              title="Customize Quick Messages in Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={() => onClearChat && onClearChat()}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isColourUI
                ? 'text-rose-400 hover:text-rose-200 hover:bg-rose-950/50'
                : isDark ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
            title="Clear Console Messages"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={handleSend}
        className={`p-3 border-t flex items-center gap-2 ${
          isColourUI
            ? 'bg-[#060a16] border-indigo-500/20'
            : isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}
      >
        <div className="relative flex-1">
          <input
            id="chat-input-field"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              canSend
                ? `Type message or /command as ${botUsername}...`
                : 'Bot is offline (Connect to send messages)'
            }
            disabled={!canSend}
            className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none disabled:opacity-50 transition-all ${
              isColourUI
                ? 'bg-[#080d1e] text-white placeholder-slate-500 border-indigo-500/40 focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : isDark
                ? 'bg-zinc-900 text-white placeholder-zinc-500 border-zinc-800 focus:border-zinc-500'
                : 'bg-white text-zinc-900 placeholder-zinc-400 border-zinc-300 focus:border-zinc-800'
            }`}
          />
          {inputText.startsWith('/') && (
            <span className={`absolute right-3 top-2.5 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold border ${
              isColourUI
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-xs'
                : isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-200 text-zinc-800 border-zinc-300'
            }`}>
              Command
            </span>
          )}
        </div>

        <motion.button
          id="btn-send-chat"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!canSend || !inputText.trim() || isSending}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer border disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed ${
            isColourUI
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white border-cyan-400/60 shadow-[0_0_16px_rgba(6,182,212,0.35)]'
              : isDark
              ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-white shadow-zinc-950/40'
              : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900 shadow-zinc-900/20'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </motion.button>
      </form>
    </div>
  );
};
