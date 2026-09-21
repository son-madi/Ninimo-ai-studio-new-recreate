import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Image as ImageIcon,
  Copy,
  Check,
  Reply,
  X,
  Trash2,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  AlertCircle,
  Maximize2,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { User, GeneralChatMessage, ChatConfig, ChatReplyPreview } from '../types';

interface GeneralChatProps {
  currentUser: User | null;
  theme: 'classic-green' | 'dark' | 'white';
  isColourUI: boolean;
  onOpenAuth: () => void;
}

export const GeneralChat: React.FC<GeneralChatProps> = ({
  currentUser,
  theme,
  isColourUI,
  onOpenAuth,
}) => {
  const [messages, setMessages] = useState<GeneralChatMessage[]>(() => {
    try {
      const cached = localStorage.getItem('ninimo_general_chat_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [config, setConfig] = useState<ChatConfig>({ allowImageUploads: true });
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatReplyPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark' || theme === 'classic-green';
  const isGreen = theme === 'classic-green';

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  const getAuthToken = () => {
    try {
      return localStorage.getItem('ninimo_token') || '';
    } catch {
      return '';
    }
  };

  const saveChatToLocalCache = (msgs: GeneralChatMessage[]) => {
    try {
      if (Array.isArray(msgs)) {
        localStorage.setItem('ninimo_general_chat_cache', JSON.stringify(msgs.slice(-200)));
      }
    } catch {}
  };

  const fetchMessages = async (silent = false) => {
    const token = getAuthToken();
    if (!token) return;
    if (!silent && messages.length === 0) setIsLoading(true);
    try {
      const res = await fetch('/api/chat/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        let serverMsgs: GeneralChatMessage[] = data.messages || [];

        // If server had 0 messages, check local cache to hydrate server
        if (serverMsgs.length === 0) {
          try {
            const localCachedRaw = localStorage.getItem('ninimo_general_chat_cache');
            if (localCachedRaw) {
              const parsedLocal = JSON.parse(localCachedRaw);
              if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
                serverMsgs = parsedLocal;
                await fetch('/api/chat/sync', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ messages: parsedLocal }),
                });
              }
            }
          } catch {}
        }

        setMessages(serverMsgs);
        saveChatToLocalCache(serverMsgs);
        if (data.config) setConfig(data.config);
      }
    } catch (err) {
      console.error('Error fetching general chat:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchMessages();
      // Poll every 3 seconds for active live chat experience
      const interval = setInterval(() => {
        fetchMessages(true);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length]);

  const handleCopyMessage = async (msg: GeneralChatMessage) => {
    try {
      const contentToCopy = msg.text || msg.imageUrl || '';
      await navigator.clipboard.writeText(contentToCopy);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
      setActiveMenuId(null);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size cap (max 4MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image file is too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedImage(result);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const trimmedText = inputText.trim();
    if (!trimmedText && !selectedImage) return;

    const token = getAuthToken();
    if (!token) {
      onOpenAuth();
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: trimmedText || undefined,
          imageUrl: selectedImage || undefined,
          replyTo: replyTarget || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const sentMsg = await res.json();
      setMessages((prev) => {
        const next = [...prev, sentMsg];
        saveChatToLocalCache(next);
        return next;
      });

      setInputText('');
      setSelectedImage(null);
      setReplyTarget(null);
      setTimeout(() => scrollToBottom(true), 50);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error sending message');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages((prev) => {
          const next = prev.filter((m) => m.id !== messageId);
          saveChatToLocalCache(next);
          return next;
        });
        setActiveMenuId(null);
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return 'Today';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Theme styling helpers
  const getContainerBg = () => {
    if (isColourUI) return 'bg-slate-950/70 border-indigo-500/30';
    if (isGreen) return 'bg-[#080d14]/90 border-emerald-900/50';
    if (isDark) return 'bg-zinc-900/90 border-zinc-800';
    return 'bg-white/95 border-slate-200';
  };

  const getChatHeaderBg = () => {
    if (isColourUI) return 'bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-slate-950 border-b border-indigo-500/30';
    if (isGreen) return 'bg-emerald-950/40 border-b border-emerald-900/40';
    if (isDark) return 'bg-zinc-900/80 border-b border-zinc-800';
    return 'bg-slate-50 border-b border-slate-200';
  };

  const getInputBg = () => {
    if (isColourUI) return 'bg-indigo-950/40 border-indigo-500/40 text-white placeholder-indigo-300/40 focus:border-cyan-400';
    if (isGreen) return 'bg-emerald-950/50 border-emerald-800 text-emerald-100 placeholder-emerald-600 focus:border-emerald-400';
    if (isDark) return 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-white';
    return 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-800';
  };

  return (
    <div className={`flex flex-col h-full rounded-2xl border overflow-hidden shadow-xl ${getContainerBg()}`}>
      {/* Chat Header */}
      <div className={`p-3.5 flex items-center justify-between shrink-0 ${getChatHeaderBg()}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
            isColourUI
              ? 'bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border-cyan-400/30 text-cyan-300'
              : isGreen
              ? 'bg-emerald-950 border-emerald-700 text-emerald-400'
              : isDark
              ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
              : 'bg-slate-100 border-slate-300 text-slate-800'
          }`}>
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-xs font-black uppercase tracking-wider ${
                isColourUI ? 'text-white' : isDark ? 'text-white' : 'text-slate-900'
              }`}>
                General Chat
              </h3>
              <span className={`inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${
                isColourUI
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : isDark
                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  isColourUI ? 'bg-cyan-400' : isDark ? 'bg-zinc-300' : 'bg-slate-700'
                }`} />
                Live
              </span>
            </div>
            <p className={`text-[10px] ${
              isColourUI ? 'text-indigo-200/70' : isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              All platform users & bot commanders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fetchMessages()}
            title="Refresh chat messages"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error / Alert banner */}
      {errorMessage && (
        <div className="p-2.5 mx-3 mt-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-[10px] font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Feed Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs min-h-[260px] max-h-[460px] scroll-smooth">
        {!currentUser ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              isColourUI ? 'bg-indigo-900/40 border-indigo-500/30 text-cyan-300' : 'bg-zinc-800 text-zinc-300'
            }`}>
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className={`text-sm font-bold ${isColourUI ? 'text-white' : isDark ? 'text-white' : 'text-slate-900'}`}>
                Sign in to join General Chat
              </h4>
              <p className={`text-xs max-w-xs ${isColourUI ? 'text-slate-400' : isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Connect with the community, reply to messages, share fleet updates and screenshots.
              </p>
            </div>
            <button
              onClick={onOpenAuth}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                isColourUI
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-cyan-500/20 hover:opacity-90'
                  : isDark
                  ? 'bg-white hover:bg-zinc-200 text-zinc-950'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              Sign In to Chat
            </button>
          </div>
        ) : messages.length === 0 && !isLoading ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2 opacity-60">
            <MessageSquare className="w-8 h-8 text-zinc-500" />
            <p className="text-xs text-zinc-400">No messages yet. Be the first to say hello!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.userId === currentUser.id;
            const showDateHeader =
              index === 0 ||
              new Date(messages[index - 1].createdAt).toDateString() !==
                new Date(msg.createdAt).toDateString();

            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="flex items-center justify-center my-2">
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                      isDark
                        ? 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {formatMessageDate(msg.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={`group relative flex gap-2.5 transition-all ${
                    isMe ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* User Profile Picture (PFP) */}
                  <div className="shrink-0 pt-0.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs uppercase overflow-hidden border shadow-xs ${
                        msg.isDev || msg.isAdmin
                          ? 'border-amber-400/60 ring-1 ring-amber-400/40 bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-300'
                          : isColourUI
                          ? 'bg-indigo-900/60 border-indigo-500/40 text-cyan-300'
                          : isGreen
                          ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                          : isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                          : 'bg-slate-100 border-slate-300 text-slate-800'
                      }`}
                    >
                      {msg.photoURL ? (
                        <img
                          src={msg.photoURL}
                          alt={msg.username}
                          className="w-full h-full object-cover rounded-xl"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            // Fallback to initials if image fails
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        msg.username.slice(0, 2)
                      )}
                    </div>
                  </div>

                  {/* Message Bubble & Context */}
                  <div
                    className={`max-w-[78%] flex flex-col ${
                      isMe ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* Header: Name + dev tag + timestamp */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 flex-wrap">
                      <span className={`text-[11px] font-bold ${
                        msg.isDev || msg.isAdmin
                          ? 'text-amber-400 font-extrabold flex items-center gap-1'
                          : isColourUI
                          ? 'text-indigo-200'
                          : isDark
                          ? 'text-zinc-300'
                          : 'text-slate-800'
                      }`}>
                        {msg.username}
                      </span>

                      {/* DEV / ADMIN BADGE: when an admin account types make it say dev next to it */}
                      {(msg.isDev || msg.isAdmin) && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded-md bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
                          <Sparkles className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          dev
                        </span>
                      )}

                      <span className={`text-[10px] font-mono flex items-center gap-0.5 ${
                        isDark ? 'text-zinc-500' : 'text-slate-400'
                      }`}>
                        <Clock className="w-2.5 h-2.5 opacity-60" />
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>

                    {/* Main Clickable Bubble */}
                    <div
                      onClick={() => setActiveMenuId(activeMenuId === msg.id ? null : msg.id)}
                      className={`relative p-3 rounded-2xl border text-xs shadow-sm cursor-pointer transition-all ${
                        isMe
                          ? isColourUI
                            ? 'bg-gradient-to-br from-cyan-600/90 to-blue-600/90 text-white border-cyan-400/50 rounded-tr-xs'
                            : isGreen
                            ? 'bg-emerald-600 text-zinc-950 font-medium border-emerald-500 rounded-tr-xs'
                            : isDark
                            ? 'bg-white text-zinc-950 font-medium border-white rounded-tr-xs'
                            : 'bg-slate-900 text-white border-slate-900 rounded-tr-xs'
                          : isColourUI
                          ? 'bg-slate-900/80 text-slate-100 border-indigo-500/30 rounded-tl-xs'
                          : isGreen
                          ? 'bg-[#0b1622] text-emerald-100 border-emerald-900/60 rounded-tl-xs'
                          : isDark
                          ? 'bg-zinc-800/90 text-zinc-100 border-zinc-700/80 rounded-tl-xs'
                          : 'bg-white text-slate-900 border-slate-200 rounded-tl-xs'
                      }`}
                    >
                      {/* Replied-to Reference Box */}
                      {msg.replyTo && (
                        <div
                          className={`mb-2 p-2 rounded-xl border text-[11px] flex flex-col gap-0.5 ${
                            isMe
                              ? 'bg-black/15 border-white/20 text-white/90'
                              : isDark
                              ? 'bg-zinc-900/70 border-zinc-700 text-zinc-300'
                              : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-bold text-[10px] opacity-80">
                            <Reply className="w-3 h-3" />
                            <span>Replying to {msg.replyTo.senderName}</span>
                          </div>
                          {msg.replyTo.text && (
                            <div className="truncate opacity-90 italic">
                              "{msg.replyTo.text}"
                            </div>
                          )}
                          {msg.replyTo.hasImage && (
                            <div className="text-[10px] opacity-75 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> Attached photo
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message Text */}
                      {msg.text && (
                        <p className="whitespace-pre-wrap break-words leading-relaxed select-text">
                          {msg.text}
                        </p>
                      )}

                      {/* Attached Image with click to zoom */}
                      {msg.imageUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-black/10 relative group/img max-w-xs">
                          <img
                            src={msg.imageUrl}
                            alt="Uploaded attachment"
                            className="w-full max-h-56 object-cover rounded-xl transition-transform hover:scale-[1.02] cursor-zoom-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage(msg.imageUrl || null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage(msg.imageUrl || null);
                            }}
                            className="absolute bottom-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                          >
                            <Maximize2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Quick Action Overlay on Click */}
                      <AnimatePresence>
                        {activeMenuId === msg.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 5 }}
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute z-30 -bottom-10 ${
                              isMe ? 'right-0' : 'left-0'
                            } flex items-center gap-1 p-1 rounded-xl shadow-xl border backdrop-blur-md ${
                              isDark
                                ? 'bg-zinc-900/95 border-zinc-700 text-zinc-200'
                                : 'bg-white/95 border-slate-300 text-slate-800'
                            }`}
                          >
                            {/* Copy Text Option */}
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg)}
                              className="px-2.5 py-1 rounded-lg hover:bg-zinc-700/50 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Reply to Message Option */}
                            <button
                              type="button"
                              onClick={() => {
                                setReplyTarget({
                                  id: msg.id,
                                  senderName: msg.username,
                                  text: msg.text,
                                  hasImage: !!msg.imageUrl,
                                });
                                setActiveMenuId(null);
                              }}
                              className="px-2.5 py-1 rounded-lg hover:bg-zinc-700/50 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Reply className="w-3 h-3 text-sky-400" />
                              <span>Reply</span>
                            </button>

                            {/* Delete Message (if owner or admin) */}
                            {(isMe || currentUser.isAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="px-2 py-1 rounded-lg hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Delete message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}

                            {/* Close Menu */}
                            <button
                              type="button"
                              onClick={() => setActiveMenuId(null)}
                              className="p-1 rounded-lg hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply target banner above input */}
      <AnimatePresence>
        {replyTarget && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`px-3 py-2 border-t flex items-center justify-between text-xs ${
              isColourUI
                ? 'bg-indigo-950/60 border-indigo-500/30 text-indigo-200'
                : isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Reply className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <div className="truncate">
                <span className="font-bold">Replying to {replyTarget.senderName}:</span>{' '}
                <span className="opacity-80 italic">
                  {replyTarget.text || (replyTarget.hasImage ? '[Image]' : '')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Banner if selected */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`px-3 py-2 border-t flex items-center justify-between ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700">
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <div className="text-xs">
                <span className="font-semibold block text-zinc-300">Ready to send photo</span>
                <span className="text-[10px] text-zinc-500">Click send or write a caption</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input & Action Bar */}
      <form onSubmit={handleSendMessage} className={`p-3 border-t shrink-0 ${
        isColourUI ? 'border-indigo-500/30 bg-slate-950/90' : isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-slate-200 bg-white'
      }`}>
        <div className="flex items-center gap-2">
          {/* Image Upload Button (Subject to Admin Config / Admin Override) */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleSelectImage}
            className="hidden"
          />

          <button
            type="button"
            disabled={!config.allowImageUploads && !currentUser?.isAdmin}
            onClick={() => fileInputRef.current?.click()}
            title={
              !config.allowImageUploads && !currentUser?.isAdmin
                ? 'Image sending disabled by admin'
                : 'Send photo or screenshot'
            }
            className={`p-2.5 rounded-xl border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isColourUI
                ? 'bg-indigo-950/50 hover:bg-indigo-900/60 border-indigo-500/40 text-cyan-300'
                : isGreen
                ? 'bg-emerald-950 hover:bg-emerald-900/60 border-emerald-800 text-emerald-300'
                : isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder={
              !currentUser
                ? 'Sign in to send a message...'
                : replyTarget
                ? `Replying to ${replyTarget.senderName}...`
                : 'Type your message to all users...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!currentUser || isSending}
            className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-all ${getInputBg()}`}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!currentUser || isSending || (!inputText.trim() && !selectedImage)}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 ${
              isColourUI
                ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 shadow-cyan-500/25'
                : isGreen
                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20'
                : isDark
                ? 'bg-white hover:bg-zinc-200 text-zinc-950 shadow-white/10'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {isSending ? (
              <span className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Image Modal Lightbox Zoom */}
      <AnimatePresence>
        {zoomedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setZoomedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={zoomedImage} alt="Zoomed view" className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-black text-white border border-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
