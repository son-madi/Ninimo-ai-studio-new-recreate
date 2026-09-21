import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BotState, GlobalStats, BotConfig, User, PublicPlatformStats, BotDefaults, QuickLoginProfile } from './types';
import { Navbar } from './components/Navbar';
import { BotList } from './components/BotList';
import { BotHud } from './components/BotHud';
import { ChatConsole } from './components/ChatConsole';
import { AntiAfkCard } from './components/AntiAfkCard';
import { ConnectionSettingsCard } from './components/ConnectionSettingsCard';
import { BotPluginsCard } from './components/BotPluginsCard';
import { BotWorkspace } from './components/BotWorkspace';
import { BotModal } from './components/BotModal';
import { AuthModal } from './components/AuthModal';
import { PlayersWidget } from './components/PlayersWidget';
import { AdminPage } from './components/AdminPage';
import { LivePlatformCounter } from './components/LivePlatformCounter';
import { TesterSwarmCommander } from './components/TesterSwarmCommander';
import { BotDefaultsModal, FACTORY_BOT_DEFAULTS } from './components/BotDefaultsModal';
import { NetherPortalCalculator } from './components/NetherPortalCalculator';
import { useTheme } from './context/ThemeContext';
import {
  Shield,
  Zap,
  Bot,
  Lock,
  ArrowRight,
  Server,
  LogIn,
  UserPlus,
  Info,
  ShieldAlert,
  ArrowLeftRight,
  Terminal,
  Compass,
  Sliders,
  LayoutGrid,
  Play
} from 'lucide-react';

import { getDeviceFingerprint } from './lib/fingerprint';

export default function App() {
  const { theme, isDark, isLight, isColourUI } = useTheme();

  const dockTabConfig: Record<string, {
    activeText: string;
    iconColor: string;
    pillClass: string;
    containerBorder: string;
  }> = {
    hud_chat: {
      activeText: !isColourUI ? (isDark ? 'text-white font-extrabold' : 'text-slate-900 font-extrabold') : 'text-cyan-300 font-extrabold',
      iconColor: !isColourUI ? (isDark ? 'text-white' : 'text-slate-900') : 'text-cyan-400',
      pillClass: isDark
        ? isColourUI
          ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/50'
          : 'bg-zinc-800 border-zinc-600 text-white shadow-[0_0_16px_rgba(255,255,255,0.12)] ring-1 ring-zinc-500'
        : !isColourUI
        ? 'bg-slate-100 border-slate-400 text-slate-900 shadow-[0_0_12px_rgba(0,0,0,0.06)] ring-1 ring-slate-300'
        : 'bg-cyan-50 border-cyan-500 text-cyan-900 shadow-[0_0_12px_rgba(6,182,212,0.2)] ring-1 ring-cyan-300',
      containerBorder: !isColourUI ? (isDark ? 'border-zinc-700/80 shadow-[0_0_20px_rgba(255,255,255,0.03)]' : 'border-slate-300 shadow-[0_0_20px_rgba(0,0,0,0.04)]') : 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.06)]',
    },
    anti_afk: {
      activeText: 'text-amber-300 font-extrabold',
      iconColor: 'text-amber-400',
      pillClass: isDark
        ? 'bg-amber-950/60 border-amber-500/70 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/50'
        : 'bg-amber-50 border-amber-500 text-amber-900 shadow-[0_0_12px_rgba(245,158,11,0.2)] ring-1 ring-amber-300',
      containerBorder: 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.06)]',
    },
    settings: {
      activeText: 'text-sky-300 font-extrabold',
      iconColor: 'text-sky-400',
      pillClass: isDark
        ? 'bg-sky-950/60 border-sky-500/70 text-sky-200 shadow-[0_0_16px_rgba(14,165,233,0.35)] ring-1 ring-sky-400/50'
        : 'bg-sky-50 border-sky-500 text-sky-900 shadow-[0_0_12px_rgba(14,165,233,0.2)] ring-1 ring-sky-300',
      containerBorder: 'border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.06)]',
    },
  };
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const token = localStorage.getItem('ninimo_token');
      const cachedProfileRaw = localStorage.getItem('ninimo_user_profile');
      if (token && cachedProfileRaw) {
        return JSON.parse(cachedProfileRaw);
      }
    } catch {}
    return null;
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(() => {
    try {
      const token = localStorage.getItem('ninimo_token');
      return !!token;
    } catch {
      return false;
    }
  });
  const [isBotsLoading, setIsBotsLoading] = useState<boolean>(() => {
    try {
      const token = localStorage.getItem('ninimo_token');
      const cachedProfileRaw = localStorage.getItem('ninimo_user_profile');
      if (token && cachedProfileRaw) {
        const user = JSON.parse(cachedProfileRaw);
        if (user?.id) {
          const cached = localStorage.getItem(`ninimo_bots_state_${user.id}`) || localStorage.getItem(`ninimo_bots_${user.id}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return false;
            }
          }
        }
        return true;
      }
    } catch {}
    return false;
  });
  const [bots, setBots] = useState<BotState[]>(() => {
    try {
      const token = localStorage.getItem('ninimo_token');
      const cachedProfileRaw = localStorage.getItem('ninimo_user_profile');
      if (token && cachedProfileRaw) {
        const user = JSON.parse(cachedProfileRaw);
        if (user?.id) {
          const cachedState = localStorage.getItem(`ninimo_bots_state_${user.id}`);
          if (cachedState) {
            const parsed = JSON.parse(cachedState);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          }
          const cachedConfigs = localStorage.getItem(`ninimo_bots_${user.id}`);
          if (cachedConfigs) {
            const parsed = JSON.parse(cachedConfigs);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.map((cfg: BotConfig) => ({
                id: cfg.id || `bot-${Date.now()}`,
                userId: user.id,
                config: cfg,
                status: 'offline' as const,
                health: 20,
                food: 20,
                saturation: 5,
                oxygen: 20,
                position: { x: 0, y: 64, z: 0, dimension: 'overworld' },
                experience: { level: 0, points: 0, progress: 0 },
                inventory: [],
                recentLogs: [],
                nearbyEntities: [],
                playersNearby: [],
                chatHistory: [],
                uptimeSeconds: 0,
                lastSpawnTimestamp: 0,
                isViewerStreaming: false,
              }));
            }
          }
        }
      }
    } catch {}
    return [];
  });
  const [selectedBotId, setSelectedBotId] = useState<string | null>(() => {
    try {
      const token = localStorage.getItem('ninimo_token');
      const cachedProfileRaw = localStorage.getItem('ninimo_user_profile');
      if (token && cachedProfileRaw) {
        const user = JSON.parse(cachedProfileRaw);
        if (user?.id) {
          const cached = localStorage.getItem(`ninimo_bots_state_${user.id}`) || localStorage.getItem(`ninimo_bots_${user.id}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed[0].id || parsed[0].config?.id || null;
            }
          }
        }
      }
    } catch {}
    return null;
  });
  const [stats, setStats] = useState<GlobalStats>({
    totalBots: 0,
    activeBots: 0,
    reconnectingBots: 0,
    stoppedBots: 0,
    totalUptimeSeconds: 0,
  });
  const [publicStats, setPublicStats] = useState<PublicPlatformStats | null>(null);
  const [isStreamConnected, setIsStreamConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('signup');
  const [editingBot, setEditingBot] = useState<BotState | null>(null);
  const [activeTab, setActiveTab] = useState<'hud_chat' | 'anti_afk' | 'settings'>('hud_chat');
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAdminPage, setShowAdminPage] = useState(false);
  const [adminReturnToken, setAdminReturnToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ninimo_admin_return_token');
    } catch {
      return null;
    }
  });
  const [globalBotLimit, setGlobalBotLimit] = useState<number>(1);
  const [isNetherCalcOpen, setIsNetherCalcOpen] = useState(false);
  const [isDefaultsOpen, setIsDefaultsOpen] = useState(false);
  const [botDefaults, setBotDefaults] = useState<BotDefaults>(() => {
    try {
      const saved = localStorage.getItem('ninimo_bot_defaults');
      if (saved) return JSON.parse(saved);
    } catch {}
    return FACTORY_BOT_DEFAULTS;
  });

  const [quickLoginUser, setQuickLoginUser] = useState<QuickLoginProfile | null>(() => {
    try {
      const raw = localStorage.getItem('ninimo_quick_login');
      if (raw) return JSON.parse(raw);
      const cachedProfile = localStorage.getItem('ninimo_user_profile');
      if (cachedProfile) {
        const u = JSON.parse(cachedProfile);
        if (u?.id && u?.username) {
          return {
            id: u.id,
            username: u.username,
            email: u.email || '',
            lastLoginTime: Date.now(),
            quickToken: localStorage.getItem('ninimo_quick_token') || undefined,
            isAdmin: !!u.isAdmin,
            isTester: !!u.isTester,
          };
        }
      }
    } catch {}
    return null;
  });
  const [isQuickLoggingIn, setIsQuickLoggingIn] = useState(false);

  const saveQuickLoginProfile = useCallback((user: User, quickToken?: string) => {
    // Only associate quickToken if it was explicitly provided or matches this user's stored session
    let tokenToSave = quickToken;
    if (!tokenToSave) {
      try {
        const stored = localStorage.getItem('ninimo_quick_login');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.id === user.id && parsed?.quickToken) {
            tokenToSave = parsed.quickToken;
          }
        }
      } catch {}
    }

    const profile: QuickLoginProfile = {
      id: user.id,
      username: user.username,
      email: user.email,
      photoURL: user.photoURL,
      lastLoginTime: Date.now(),
      quickToken: tokenToSave,
      isAdmin: !!user.isAdmin,
      isTester: !!user.isTester,
    };
    setQuickLoginUser(profile);
    try {
      localStorage.setItem('ninimo_quick_login', JSON.stringify(profile));
      if (tokenToSave) {
        localStorage.setItem('ninimo_quick_token', tokenToSave);
      } else {
        localStorage.removeItem('ninimo_quick_token');
      }
    } catch {}
  }, []);

  const handleQuickLogin = async () => {
    let target = quickLoginUser;
    if (!target) {
      try {
        const raw = localStorage.getItem('ninimo_quick_login');
        if (raw) target = JSON.parse(raw);
        else {
          const cachedProfile = localStorage.getItem('ninimo_user_profile');
          if (cachedProfile) {
            const u = JSON.parse(cachedProfile);
            if (u?.id && u?.username) {
              target = {
                id: u.id,
                username: u.username,
                email: u.email || '',
                lastLoginTime: Date.now(),
                quickToken: localStorage.getItem('ninimo_quick_token') || undefined,
                isAdmin: !!u.isAdmin,
                isTester: !!u.isTester,
              };
            }
          }
        }
      } catch {}
    }

    if (!target) {
      showToast('No saved session found on this device');
      return;
    }
    setIsQuickLoggingIn(true);
    try {
      const deviceFingerprint = getDeviceFingerprint();
      const quickToken = target.quickToken || localStorage.getItem('ninimo_quick_token');
      const res = await fetch('/api/auth/quick-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceFingerprint,
          'X-Device-Fingerprint': deviceFingerprint,
        },
        body: JSON.stringify({
          quickToken,
          userId: target.id,
          deviceFingerprint,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // If the token was invalid or expired, purge to avoid repeat mismatch errors
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('ninimo_quick_token');
        }
        throw new Error(data.error || 'Quick login failed');
      }

      // Explicitly purge previous bot workspace state before applying new user
      setBots([]);
      setSelectedBotId(null);
      setEditingBot(null);

      localStorage.setItem('ninimo_token', data.token);
      try {
        localStorage.setItem('ninimo_user_profile', JSON.stringify(data.user));
      } catch {}
      if (data.quickToken) {
        localStorage.setItem('ninimo_quick_token', data.quickToken);
      }

      saveQuickLoginProfile(data.user, data.quickToken);
      setCurrentUser(data.user);
      setIsAuthModalOpen(false);
      showToast(`Welcome back, ${data.user.username}!`);
      setIsBotsLoading(true);
      fetchBots(data.user);
    } catch (err: any) {
      showToast(err.message || 'Quick login failed. Please sign in with your credentials.');
    } finally {
      setIsQuickLoggingIn(false);
    }
  };

  const handleForgetQuickLogin = async () => {
    try {
      const quickToken = quickLoginUser?.quickToken || localStorage.getItem('ninimo_quick_token');
      if (quickToken) {
        fetch('/api/auth/revoke-quick-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quickToken }),
        }).catch(() => {});
      }
    } catch {}
    localStorage.removeItem('ninimo_quick_token');
    localStorage.removeItem('ninimo_quick_login');
    setQuickLoginUser(null);
    showToast('Previous login forgotten on this device.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Client device ID generator & persistent cookie/storage sync
  const getBrowserDeviceId = (): string => {
    return getDeviceFingerprint();
  };

  // Helper for authenticated requests
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('ninimo_token');
    const deviceId = getDeviceFingerprint();
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Device-Id': deviceId,
      'X-Device-Fingerprint': deviceId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
    return fetch(url, { ...options, headers });
  }, []);

  const safeParseJson = useCallback(async <T = any>(res: Response): Promise<T | null> => {
    try {
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return null;
      }
      const text = await res.text();
      if (!text || text.trim().startsWith('<')) {
        return null;
      }
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }, []);

  const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Backup bot configs in browser storage per user and Firestore with debouncing
  const saveBotsToLocalStorage = useCallback((userId: string, currentBots: BotState[]) => {
    if (!userId || currentBots.length === 0) return;
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }
    saveDebounceTimerRef.current = setTimeout(() => {
      try {
        const configsToSave = currentBots.map((b) => {
          const isRunning = b.status === 'online' || b.status === 'starting' || b.status === 'reconnecting';
          const shouldRun = b.config.shouldRun !== undefined ? Boolean(b.config.shouldRun) : isRunning;
          return {
            ...b.config,
            shouldRun,
          };
        });
        localStorage.setItem(`ninimo_bots_${userId}`, JSON.stringify(configsToSave));
        // Save slim state to avoid massive synchronous localStorage blocks
        const slimBots = currentBots.map((b) => {
          const isRunning = b.status === 'online' || b.status === 'starting' || b.status === 'reconnecting';
          const shouldRun = b.config.shouldRun !== undefined ? Boolean(b.config.shouldRun) : isRunning;
          return {
            ...b,
            config: {
              ...b.config,
              shouldRun,
            },
            chatHistory: b.chatHistory.slice(-25),
          };
        });
        localStorage.setItem(`ninimo_bots_state_${userId}`, JSON.stringify(slimBots));
      } catch {}
    }, 2000);
  }, []);

  const getBotsFromLocalStorage = useCallback((userId: string): BotConfig[] => {
    try {
      if (!userId) return [];
      const raw = localStorage.getItem(`ninimo_bots_${userId}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const refreshBots = useCallback(async () => {
    if (!currentUser) {
      setIsBotsLoading(false);
      return;
    }
    try {
      const res = await authFetch('/api/bots');
      if (res.ok) {
        const data = await safeParseJson<{ bots?: BotState[] }>(res);
        if (data && Array.isArray(data.bots)) {
          setBots(data.bots);
          saveBotsToLocalStorage(currentUser.id, data.bots);
          if (data.bots.length > 0 && !selectedBotId) {
            setSelectedBotId(data.bots[0].id);
          }
        }
      }
    } catch {} finally {
      setIsBotsLoading(false);
    }
  }, [currentUser, authFetch, selectedBotId, saveBotsToLocalStorage, safeParseJson]);

  // Check existing auth, global settings, and load public platform metrics on load
  useEffect(() => {
    // Load public metrics immediately
    fetch('/api/stats/public')
      .then((res) => (res.ok ? safeParseJson<PublicPlatformStats>(res) : null))
      .then((data) => {
        if (data) setPublicStats(data);
      })
      .catch(() => {});

    // Load global settings
    fetch('/api/settings')
      .then((res) => (res.ok ? safeParseJson<{ globalBotLimit?: number }>(res) : null))
      .then((data) => {
        if (data?.globalBotLimit) {
          setGlobalBotLimit(data.globalBotLimit);
        }
      })
      .catch(() => {});

    const token = localStorage.getItem('ninimo_token');
    const cachedProfileRaw = localStorage.getItem('ninimo_user_profile');
    let cachedProfile: User | null = null;
    try {
      if (cachedProfileRaw) cachedProfile = JSON.parse(cachedProfileRaw);
    } catch {}

    if (!token && !cachedProfile) {
      setIsAuthChecking(false);
      return;
    }

    const deviceId = getDeviceFingerprint();
    fetch('/api/auth/me', {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Device-Id': deviceId,
        'X-Device-Fingerprint': deviceId,
      },
    })
      .then(async (res) => {
        if (res.ok) {
          return await safeParseJson<{ user?: User }>(res);
        }

        // If server had a container reboot or session dropped, self-heal via restore-session
        if (token && cachedProfile) {
          console.log('[AUTO-RESTORE] Restoring user session from local client cache...');
          try {
            const restoreRes = await fetch('/api/auth/restore-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ token, user: cachedProfile }),
            });
            if (restoreRes.ok) {
              return await safeParseJson<{ user?: User }>(restoreRes);
            }
          } catch {}
        }

        if (res.status === 401 && !cachedProfile) {
          localStorage.removeItem('ninimo_token');
          localStorage.removeItem('ninimo_user_profile');
          setCurrentUser(null);
        }
        return null;
      })
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
          try {
            localStorage.setItem('ninimo_user_profile', JSON.stringify(data.user));
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('Network issue during auth verification, preserving cached session:', err);
        if (cachedProfile) {
          setCurrentUser(cachedProfile);
        }
      })
      .finally(() => {
        setIsAuthChecking(false);
      });
  }, [safeParseJson]);

  const handleImpersonate = (token: string, targetUser: User) => {
    const currentToken = localStorage.getItem('ninimo_token');
    if (currentToken && currentUser?.isAdmin) {
      localStorage.setItem('ninimo_admin_return_token', currentToken);
      setAdminReturnToken(currentToken);
    }
    // Immediately isolate and clear bot state to prevent cross-account contamination
    setBots([]);
    setSelectedBotId(null);
    localStorage.setItem('ninimo_token', token);
    try {
      localStorage.setItem('ninimo_user_profile', JSON.stringify(targetUser));
    } catch {}
    setCurrentUser(targetUser);
    setShowAdminPage(false);
    fetchBots(targetUser);
    showToast(`Logged into account "${targetUser.username}". Isolated session loaded.`);
  };

  const handleExitImpersonation = async () => {
    if (!adminReturnToken) return;
    // Immediately clear bot state before switching back
    setBots([]);
    setSelectedBotId(null);
    const returnTok = adminReturnToken;
    localStorage.setItem('ninimo_token', returnTok);
    localStorage.removeItem('ninimo_admin_return_token');
    setAdminReturnToken(null);
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${returnTok}` },
      });
      if (res.ok) {
        const data = await res.json();
        try {
          localStorage.setItem('ninimo_user_profile', JSON.stringify(data.user));
        } catch {}
        setCurrentUser(data.user);
        setShowAdminPage(true);
        fetchBots(data.user);
        showToast('Returned to Administrator account.');
      }
    } catch {
      showToast('Returned to Administrator account.');
    }
  };

  // Fetch current user's bots strictly isolated by user with automatic self-healing restore
  const fetchBots = useCallback(async (explicitUser?: User) => {
    const activeUser = explicitUser || currentUser;
    const token = localStorage.getItem('ninimo_token');
    if (!token || !activeUser) {
      setBots([]);
      setSelectedBotId(null);
      setIsBotsLoading(false);
      return;
    }

    try {
      const res = await authFetch('/api/bots');
      if (res.ok) {
        const data = await safeParseJson<{ bots?: BotState[] }>(res);
        const userBots: BotState[] = data?.bots || [];

        // Check if server was restarted and only has 0 bots or default untouched placeholder bot
        const isOnlyPlaceholder =
          userBots.length === 0 ||
          (userBots.length === 1 &&
            userBots[0].config.name === 'NinimoBot' &&
            userBots[0].config.host === 'play.hypixel.net' &&
            userBots[0].status === 'stopped');

        let resolvedBots = userBots;

        if (isOnlyPlaceholder) {
          // Check local storage cache
          const localBots = getBotsFromLocalStorage(activeUser.id);
          const hasCustomLocalBots =
            localBots.length > 0 &&
            !(localBots.length === 1 && localBots[0].name === 'NinimoBot' && localBots[0].host === 'play.hypixel.net');

          if (hasCustomLocalBots) {
            try {
              const syncRes = await authFetch('/api/bots/sync', {
                method: 'POST',
                body: JSON.stringify({ bots: localBots }),
              });
              if (syncRes.ok) {
                const syncData = await safeParseJson<{ bots?: BotState[] }>(syncRes);
                if (syncData?.bots && syncData.bots.length > 0) {
                  resolvedBots = syncData.bots;
                }
              }
            } catch {}
          }
        }

        // Strictly set this user's bots without cross-syncing other accounts
        setBots(resolvedBots);
        saveBotsToLocalStorage(activeUser.id, resolvedBots);

        if (resolvedBots.length > 0) {
          setSelectedBotId((prev) => {
            if (prev && resolvedBots.some((b) => b.id === prev)) {
              return prev;
            }
            return resolvedBots[0].id;
          });
        } else {
          setSelectedBotId(null);
        }
      } else if (res.status === 401) {
        // Token invalid/expired
        localStorage.removeItem('ninimo_token');
        localStorage.removeItem('ninimo_user_profile');
        setCurrentUser(null);
        setBots([]);
        setSelectedBotId(null);
      }

      const statsRes = await authFetch('/api/stats');
      if (statsRes.ok) {
        const sData = await safeParseJson<GlobalStats>(statsRes);
        if (sData) {
          setStats(sData);
        }
      }
    } catch (err) {
      console.warn('Network issue while fetching user state:', err);
    } finally {
      setIsBotsLoading(false);
    }
  }, [authFetch, currentUser, saveBotsToLocalStorage, getBotsFromLocalStorage, safeParseJson]);

  // Self-healing keepalive ping loop every 25 seconds to keep Google Cloud Run active and prevent container idle kill
  useEffect(() => {
    const keepaliveTimer = setInterval(() => {
      fetch('/api/ping', { method: 'POST' }).catch(() => {});
    }, 25000);

    return () => clearInterval(keepaliveTimer);
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchBots();
    } else {
      setBots([]);
      setSelectedBotId(null);
      setStats({
        totalBots: 0,
        activeBots: 0,
        reconnectingBots: 0,
        stoppedBots: 0,
        totalUptimeSeconds: 0,
      });
    }
  }, [currentUser, fetchBots]);

  // Real-time SSE Stream for the authenticated user with automatic reconnection
  useEffect(() => {
    const token = localStorage.getItem('ninimo_token');
    if (!currentUser || !token) {
      setIsStreamConnected(false);
      return;
    }

    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    const connectSSE = () => {
      if (!isSubscribed) return;
      if (eventSource) {
        eventSource.close();
      }

      const deviceId = getBrowserDeviceId();
      eventSource = new EventSource(`/api/events?token=${encodeURIComponent(token)}&deviceId=${encodeURIComponent(deviceId)}`);

      eventSource.onopen = () => {
        if (isSubscribed) setIsStreamConnected(true);
      };

      eventSource.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const payload = JSON.parse(event.data);

          if (payload.event === 'initial_state') {
            if (payload.data.globalBotLimit) {
              setGlobalBotLimit(payload.data.globalBotLimit);
            }
            if (payload.data.bots) {
              setBots(payload.data.bots);
              saveBotsToLocalStorage(currentUser.id, payload.data.bots);
              if (payload.data.bots.length > 0 && !selectedBotId) {
                setSelectedBotId(payload.data.bots[0].id);
              }
            }
            if (payload.data.stats) {
              setStats(payload.data.stats);
            }
          } else if (payload.event === 'settings_update') {
            if (payload.data.globalBotLimit) {
              setGlobalBotLimit(payload.data.globalBotLimit);
            }
          } else if (payload.event === 'bot_update') {
            const updatedBot: BotState = payload.data;
            setBots((prev) => {
              const updated = prev.map((b) => (b.id === updatedBot.id ? updatedBot : b));
              saveBotsToLocalStorage(currentUser.id, updated);
              return updated;
            });
          } else if (payload.event === 'chat_message') {
            const { botId, message } = payload.data;
            setBots((prev) =>
              prev.map((b) => {
                if (b.id === botId) {
                  const newHistory = [...b.chatHistory, message];
                  if (newHistory.length > 150) newHistory.shift();
                  return { ...b, chatHistory: newHistory };
                }
                return b;
              })
            );
          } else if (payload.event === 'bot_created') {
            setBots((prev) => {
              const next = [...prev, payload.data];
              saveBotsToLocalStorage(currentUser.id, next);
              return next;
            });
            setSelectedBotId(payload.data.id);
          } else if (payload.event === 'bot_deleted') {
            setBots((prev) => {
              const next = prev.filter((b) => b.id !== payload.data.id);
              saveBotsToLocalStorage(currentUser.id, next);
              return next;
            });
            setSelectedBotId((prev) => (prev === payload.data.id ? null : prev));
          } else if (payload.event === 'stats') {
            setStats(payload.data);
          } else if (payload.event === 'admin_notification') {
            const { title, body } = payload.data;
            // Show toast notification
            showToast(`${title}: ${body}`);
            
            // Try to show a system push notification if supported and permitted
            if ('Notification' in window) {
              if (Notification.permission === 'granted') {
                try {
                  new Notification(title, { body, icon: '/favicon.ico' });
                } catch (e) {
                  console.warn('Failed to show system notification', e);
                }
              } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                  if (permission === 'granted') {
                    try {
                      new Notification(title, { body, icon: '/favicon.ico' });
                    } catch (e) {
                      console.warn('Failed to show system notification', e);
                    }
                  }
                });
              }
            }
          }
        } catch {
          // ignore
        }
      };

      eventSource.onerror = () => {
        if (!isSubscribed) return;
        setIsStreamConnected(false);
        eventSource?.close();
        // Automatically reconnect after short pause
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          if (isSubscribed) connectSSE();
        }, 3000);
      };
    };

    connectSSE();

    fallbackInterval = setInterval(() => {
      if (!isStreamConnected && currentUser) {
        fetchBots();
      }
    }, 5000);

    return () => {
      isSubscribed = false;
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [currentUser, fetchBots, isStreamConnected, saveBotsToLocalStorage, selectedBotId]);

  // Real-time Public SSE stream for guest live counter
  useEffect(() => {
    if (currentUser) return;

    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const connectPublicSSE = () => {
      eventSource = new EventSource('/api/events/public');

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'initial_public_state' || payload.event === 'public_stats_update') {
            setPublicStats(payload.data);
          }
        } catch {
          // ignore
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
      };
    };

    connectPublicSSE();

    fallbackInterval = setInterval(() => {
      fetch('/api/stats/public')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setPublicStats(data);
        })
        .catch(() => {});
    }, 6000);

    return () => {
      eventSource?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [currentUser]);

  const handleLogout = async () => {
    if (currentUser) {
      saveQuickLoginProfile(currentUser);
    }
    const token = localStorage.getItem('ninimo_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('ninimo_token');
    localStorage.removeItem('ninimo_user_profile');
    localStorage.removeItem('ninimo_admin_return_token');
    setAdminReturnToken(null);
    setShowAdminPage(false);
    setCurrentUser(null);
    setBots([]);
    setSelectedBotId(null);
    setIsBotsLoading(false);
    setIsStreamConnected(false);
    showToast('Signed out. Your private bot configurations are saved.');
  };

  const openAuth = (mode: 'login' | 'signup' = 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Active bot selection
  const activeBot = bots.find((b) => b.id === selectedBotId) || bots[0] || null;

  // Bot actions
  const handleStartBot = async (id: string) => {
    const isPrivileged = currentUser?.isAdmin || currentUser?.isTester || currentUser?.username?.toUpperCase() === 'TESTER';
    if (!isPrivileged) {
      const runningBots = bots.filter(
        (b) => b.id !== id && (b.status === 'online' || b.status === 'reconnecting' || b.status === 'starting')
      );

      if (runningBots.length >= globalBotLimit) {
        showToast(`Active limit reached (${globalBotLimit} max): Please stop a running bot before activating this one!`);
        return;
      }
    }

    if (currentUser) {
      setBots((prev) => {
        const next = prev.map((b) => (b.id === id ? { ...b, status: 'starting' as const, config: { ...b.config, shouldRun: true } } : b));
        saveBotsToLocalStorage(currentUser.id, next);
        return next;
      });
    }

    try {
      const res = await authFetch(`/api/bots/${id}/start`, { method: 'POST' });
      if (res.ok) {
        const data = await safeParseJson<{ bot?: BotState }>(res);
        if (data?.bot) {
          setBots((prev) => prev.map((b) => (b.id === id ? data.bot! : b)));
        }
        showToast('Connecting bot to Minecraft server...');
      } else {
        const err = await safeParseJson<{ error?: string }>(res);
        showToast(err?.error || `Active limit: Only ${globalBotLimit} active bot(s) allowed across your accounts. Stop another running bot first!`);
        fetchBots();
      }
    } catch {
      showToast('Error connecting bot');
      fetchBots();
    }
  };

  const handleStopBot = async (id: string) => {
    if (currentUser) {
      setBots((prev) => {
        const next = prev.map((b) => (b.id === id ? { ...b, status: 'stopped' as const, config: { ...b.config, shouldRun: false } } : b));
        saveBotsToLocalStorage(currentUser.id, next);
        return next;
      });
    }

    try {
      const res = await authFetch(`/api/bots/${id}/stop`, { method: 'POST' });
      if (res.ok) {
        showToast('Bot stopped');
      } else {
        showToast('Failed to stop bot');
      }
    } catch {
      showToast('Error stopping bot');
    }
  };

  const handleRestartBot = async (id: string) => {
    try {
      const res = await authFetch(`/api/bots/${id}/restart`, { method: 'POST' });
      if (res.ok) {
        showToast('Restarting bot connection...');
      } else {
        showToast('Failed to restart bot');
      }
    } catch {
      showToast('Error restarting bot');
    }
  };

  // Fetch bot defaults from server when currentUser logs in
  useEffect(() => {
    if (!currentUser) return;
    authFetch('/api/user/bot-defaults')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.defaults) {
          setBotDefaults(data.defaults);
          try {
            localStorage.setItem('ninimo_bot_defaults', JSON.stringify(data.defaults));
          } catch {}
        }
      })
      .catch(() => {});
  }, [currentUser, authFetch]);

  const handleSaveDefaults = async (newDefaults: BotDefaults) => {
    setBotDefaults(newDefaults);
    try {
      localStorage.setItem('ninimo_bot_defaults', JSON.stringify(newDefaults));
    } catch {}
    try {
      await authFetch('/api/user/bot-defaults', {
        method: 'POST',
        body: JSON.stringify(newDefaults),
      });
      showToast('New bot defaults saved to your account!');
    } catch {
      showToast('Presets saved locally');
    }
  };

  const handleClearChat = async () => {
    if (!activeBot) return;
    try {
      const res = await authFetch(`/api/bots/${activeBot.id}/clear-chat`, { method: 'POST' });
      if (res.ok) {
        setBots((prev) =>
          prev.map((b) => (b.id === activeBot.id ? { ...b, chatHistory: [] } : b))
        );
        showToast('Console chat history cleared');
      }
    } catch {
      showToast('Error clearing chat');
    }
  };

  const handleSendMessage = async (msg: string): Promise<boolean> => {
    if (!activeBot) return false;
    try {
      const res = await authFetch(`/api/bots/${activeBot.id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleSaveBotConfig = async (updated: Partial<BotConfig>) => {
    if (!activeBot || !currentUser) return;
    try {
      const res = await authFetch(`/api/bots/${activeBot.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const data = await res.json();
        // Update local state immediately
        if (data.bot) {
          setBots((prev) => {
            const next = prev.map((b) => (b.id === data.bot.id ? data.bot : b));
            saveBotsToLocalStorage(currentUser.id, next);
            return next;
          });
        }
        showToast('Configuration saved to your account!');
      } else {
        showToast('Failed to update bot configuration');
      }
    } catch {
      showToast('Error updating configuration');
    }
  };

  const handleToggleAntiAfk = async (id: string, enabled: boolean) => {
    const target = bots.find((b) => b.id === id);
    if (!target || !currentUser) return;
    const updatedAfk = { ...target.config.antiAfk, enabled };
    try {
      const res = await authFetch(`/api/bots/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ antiAfk: updatedAfk }),
      });
      if (res.ok) {
        setBots((prev) => {
          const next = prev.map((b) =>
            b.id === id ? { ...b, config: { ...b.config, antiAfk: updatedAfk } } : b
          );
          saveBotsToLocalStorage(currentUser.id, next);
          return next;
        });
        showToast(enabled ? 'Anti-AFK movement activated' : 'Anti-AFK paused');
      }
    } catch {
      showToast('Failed to update Anti-AFK');
    }
  };

  const handleToggleAutoReconnect = async (id: string, autoReconnect: boolean) => {
    const target = bots.find((b) => b.id === id);
    if (!target || !currentUser) return;
    try {
      const res = await authFetch(`/api/bots/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ autoReconnect }),
      });
      if (res.ok) {
        setBots((prev) => {
          const next = prev.map((b) =>
            b.id === id ? { ...b, config: { ...b.config, autoReconnect } } : b
          );
          saveBotsToLocalStorage(currentUser.id, next);
          return next;
        });
        showToast(autoReconnect ? '24/7 Auto-reconnect enabled' : 'Auto-reconnect paused');
      }
    } catch {
      showToast('Failed to update Auto-Reconnect');
    }
  };

  const handleTriggerTestMove = async () => {
    if (!activeBot) return;
    try {
      const res = await authFetch(`/api/bots/${activeBot.id}/test-move`, {
        method: 'POST',
      });
      if (res.ok) {
        showToast('Safe In-Place test routine executed successfully!');
      } else {
        showToast('Bot must be connected to test movement');
      }
    } catch {
      showToast('Error testing movement');
    }
  };

  const handleDeleteBot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bot profile?')) return;
    if (!currentUser) return;
    try {
      const res = await authFetch(`/api/bots/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBots((prev) => {
          const next = prev.filter((b) => b.id !== id);
          saveBotsToLocalStorage(currentUser.id, next);
          return next;
        });
        setSelectedBotId((prev) => (prev === id ? null : prev));
        showToast('Bot profile deleted');
      } else {
        showToast('Failed to delete bot');
      }
    } catch {
      showToast('Error deleting bot');
    }
  };

  const handleCreateOrUpdateModal = async (data: Partial<BotConfig>) => {
    if (!currentUser) return;
    if (editingBot) {
      const res = await authFetch(`/api/bots/${editingBot.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        if (updated.bot) {
          setBots((prev) => {
            const next = prev.map((b) => (b.id === updated.bot.id ? updated.bot : b));
            saveBotsToLocalStorage(currentUser.id, next);
            return next;
          });
        }
        showToast('Bot updated successfully!');
      } else {
        showToast('Failed to update bot');
      }
    } else {
      const isPrivileged = currentUser?.isAdmin || currentUser?.isTester || currentUser?.username?.toUpperCase() === 'TESTER';
      if (!isPrivileged && bots.length >= globalBotLimit) {
        showToast(`Limit reached: ${globalBotLimit} bot(s) per account profile. Edit your active bot or switch accounts.`);
        return;
      }
      const res = await authFetch('/api/bots', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        showToast('Bot profile created!');
        if (created.bot?.id) {
          setBots((prev) => {
            const next = [...prev, created.bot];
            saveBotsToLocalStorage(currentUser.id, next);
            return next;
          });
          setSelectedBotId(created.bot.id);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || `Failed to create bot: ${globalBotLimit} bot limit per account`);
      }
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans relative transition-colors duration-500 ease-in-out ${
        isLight
          ? 'bg-slate-50 text-slate-900 selection:bg-slate-200 selection:text-slate-900'
          : isColourUI
          ? 'bg-[#050914] text-slate-100 selection:bg-indigo-900 selection:text-white'
          : 'bg-zinc-950 text-zinc-100 selection:bg-zinc-700 selection:text-white'
      }`}
    >
      {/* Ambient Theme Transition Flash Overlay */}
      <AnimatePresence>
        <motion.div
          key={`theme-flash-${theme}`}
          initial={{ opacity: 0.15 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`fixed inset-0 pointer-events-none z-[9999] mix-blend-overlay ${
            isColourUI
              ? 'bg-cyan-500'
              : isLight
              ? 'bg-amber-100'
              : 'bg-zinc-200'
          }`}
        />
      </AnimatePresence>
      {/* Navbar with Ninimo branding, admin tools, and auth */}
      <Navbar
        stats={stats}
        publicStats={publicStats}
        isStreamConnected={isStreamConnected}
        currentUser={currentUser}
        globalBotLimit={globalBotLimit}
        showingAdminPage={showAdminPage}
        isImpersonating={!!adminReturnToken}
        onOpenAdmin={() => setShowAdminPage((prev) => !prev)}
        onExitImpersonation={handleExitImpersonation}
        onAddNewBot={() => {
          if (!currentUser) {
            openAuth('login');
            return;
          }
          const isPrivileged = currentUser?.isAdmin || currentUser?.isTester || currentUser?.username?.toUpperCase() === 'TESTER';
          if (!isPrivileged && bots.length >= globalBotLimit) {
            showToast(`Limit reached: Maximum ${globalBotLimit} bot(s) allowed per account. Edit your active bot or switch accounts.`);
            return;
          }
          setEditingBot(null);
          setIsModalOpen(true);
        }}
        onOpenAuth={() => openAuth('login')}
        onOpenSignUp={() => {
          if (!currentUser) {
            const signupCard = document.getElementById('landing-signup-card');
            if (signupCard) {
              signupCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
              const input = signupCard.querySelector('input');
              if (input) input.focus();
              return;
            }
          }
          openAuth('signup');
        }}
        onLogout={handleLogout}
        onOpenNetherCalc={() => setIsNetherCalcOpen(true)}
        onOpenDefaults={() => setIsDefaultsOpen(true)}
        quickLoginUser={quickLoginUser}
        onQuickLogin={handleQuickLogin}
        isQuickLoggingIn={isQuickLoggingIn}
        onForgetQuickLogin={handleForgetQuickLogin}
      />

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto ${currentUser ? 'max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6' : 'p-0'}`}>
        {/* Toast Notification with spring animation */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md border ${
                isDark ? 'bg-zinc-900/95 border-zinc-700 text-white' : 'bg-white/95 border-zinc-300 text-zinc-900 shadow-zinc-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-zinc-400 animate-ping" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Authenticated View vs Guest Security Gateway with Live Bot Profiles & Online Counter */}
        {!currentUser ? (
          <div className="py-1 sm:py-2">
            <LivePlatformCounter
              publicStats={publicStats}
              onSignUp={() => openAuth('signup')}
              onSignIn={() => openAuth('login')}
              quickLoginUser={quickLoginUser}
              onQuickLogin={handleQuickLogin}
              isQuickLoggingIn={isQuickLoggingIn}
              onForgetQuickLogin={handleForgetQuickLogin}
              onAuthSuccess={(user, token, quickToken) => {
                setBots([]);
                setSelectedBotId(null);
                setEditingBot(null);
                saveQuickLoginProfile(user, quickToken);
                setCurrentUser(user);
                try {
                  localStorage.setItem('ninimo_token', token);
                  localStorage.setItem('ninimo_user_profile', JSON.stringify(user));
                } catch {}
                setIsBotsLoading(true);
                showToast(`Welcome, ${user.username}!`);
                fetchBots(user);
              }}
            />
          </div>
        ) : currentUser && showAdminPage && currentUser.isAdmin ? (
          <AdminPage
            currentUser={currentUser}
            onBackToDashboard={() => setShowAdminPage(false)}
            onImpersonate={handleImpersonate}
            authFetch={authFetch}
          />
        ) : isBotsLoading && bots.length === 0 ? (
          <div className="space-y-4 py-6 animate-pulse">
            <div className={`h-16 rounded-2xl border ${isColourUI ? 'bg-slate-900/40 border-slate-800' : isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`} />
            <div className={`h-80 rounded-3xl border ${isColourUI ? 'bg-slate-900/40 border-slate-800' : isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`} />
          </div>
        ) : (
          <>
            {/* Impersonation Indicator Banner */}
            {adminReturnToken && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 text-xs shadow-md">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Admin Impersonation Mode:</strong> Currently viewing and managing the account of <strong>{currentUser?.username}</strong>.
                  </span>
                </div>
                <button
                  onClick={handleExitImpersonation}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 shadow-sm"
                >
                  Return to Admin Account
                </button>
              </div>
            )}

            {/* Tester Account Multi-Bot Swarm Commander */}
            {(currentUser?.isTester || currentUser?.username?.toUpperCase() === 'TESTER') && (
              <TesterSwarmCommander
                currentUser={currentUser}
                token={localStorage.getItem('ninimo_token') || ''}
                bots={bots}
                onRefresh={refreshBots}
              />
            )}

            {/* Bot Profiles Carousel / Selector */}
            <BotList
              bots={bots}
              selectedBotId={activeBot?.id || null}
              globalBotLimit={globalBotLimit}
              isAdmin={!!(currentUser?.isAdmin || currentUser?.isTester || currentUser?.username?.toUpperCase() === 'TESTER')}
              onSelectBot={(id) => {
                setSelectedBotId(id);
              }}
              onStartBot={handleStartBot}
              onStopBot={handleStopBot}
              onAddNewBot={() => {
                const isPrivileged = currentUser?.isAdmin || currentUser?.isTester || currentUser?.username?.toUpperCase() === 'TESTER';
                if (!isPrivileged && bots.length >= globalBotLimit) {
                  showToast(`Limit: Maximum ${globalBotLimit} bot(s) allowed per account.`);
                  return;
                }
                setEditingBot(null);
                setIsModalOpen(true);
              }}
            />

            {/* Unified Control Dock: HUD & Chat, Anti-AFK, Server Join, Nether Calc, 3D Workspace */}
            <div className={`border rounded-2xl p-1.5 shadow-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 transition-all duration-300 ${
              isColourUI
                ? `${dockTabConfig[activeTab]?.containerBorder || 'border-zinc-800'} ${isDark ? 'bg-zinc-950/90' : 'bg-white'}`
                : isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}>
              {/* Left: View Switching Tabs with smooth Spring Indicator */}
              <div className="grid grid-cols-3 sm:flex sm:items-center gap-1 sm:gap-1.5 w-full sm:w-auto flex-1 py-0.5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setActiveTab('hud_chat')}
                  className={`w-full sm:w-auto flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition-colors duration-200 relative z-10 cursor-pointer whitespace-nowrap overflow-hidden border text-center ${
                    activeTab === 'hud_chat'
                      ? 'border-transparent ' + (isColourUI ? dockTabConfig.hud_chat.activeText : isDark ? 'text-white' : 'text-zinc-950')
                      : isColourUI
                      ? 'border-slate-800/80 hover:border-cyan-500/50 bg-slate-900/40 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                      : isDark
                      ? 'border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                      : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <Terminal className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${
                    isColourUI
                      ? (activeTab === 'hud_chat' ? 'text-cyan-400' : 'text-cyan-500/70')
                      : activeTab === 'hud_chat'
                      ? (isDark ? 'text-white' : 'text-zinc-950')
                      : isDark ? 'text-zinc-400' : 'text-zinc-500'
                  }`} />
                  <span>HUD & Chat</span>
                  {activeTab === 'hud_chat' && (
                    <motion.div
                      layoutId="bot-view-tab-pill"
                      className={`absolute inset-0 rounded-xl -z-10 border transition-shadow duration-300 ${
                        isColourUI
                          ? dockTabConfig.hud_chat.pillClass
                          : isDark
                          ? 'bg-zinc-800 border-zinc-600 shadow-sm'
                          : 'bg-zinc-100 border-zinc-300 shadow-sm'
                      }`}
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setActiveTab('anti_afk')}
                  className={`w-full sm:w-auto flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition-colors duration-200 relative z-10 cursor-pointer whitespace-nowrap overflow-hidden border text-center ${
                    activeTab === 'anti_afk'
                      ? 'border-transparent ' + (isColourUI ? dockTabConfig.anti_afk.activeText : isDark ? 'text-white' : 'text-zinc-950')
                      : isColourUI
                      ? 'border-slate-800/80 hover:border-amber-500/50 bg-slate-900/40 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                      : isDark
                      ? 'border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                      : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${
                    isColourUI
                      ? (activeTab === 'anti_afk' ? 'text-amber-400' : 'text-amber-500/70')
                      : activeTab === 'anti_afk'
                      ? (isDark ? 'text-white' : 'text-zinc-950')
                      : isDark ? 'text-zinc-400' : 'text-zinc-500'
                  }`} />
                  <span>Anti-AFK</span>
                  {activeTab === 'anti_afk' && (
                    <motion.div
                      layoutId="bot-view-tab-pill"
                      className={`absolute inset-0 rounded-xl -z-10 border transition-shadow duration-300 ${
                        isColourUI
                          ? dockTabConfig.anti_afk.pillClass
                          : isDark
                          ? 'bg-zinc-800 border-zinc-600 shadow-sm'
                          : 'bg-zinc-100 border-zinc-300 shadow-sm'
                      }`}
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`w-full sm:w-auto flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition-colors duration-200 relative z-10 cursor-pointer whitespace-nowrap overflow-hidden border text-center ${
                    activeTab === 'settings'
                      ? 'border-transparent ' + (isColourUI ? dockTabConfig.settings.activeText : isDark ? 'text-white' : 'text-zinc-950')
                      : isColourUI
                      ? 'border-slate-800/80 hover:border-sky-500/50 bg-slate-900/40 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                      : isDark
                      ? 'border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                      : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <Server className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${
                    isColourUI
                      ? (activeTab === 'settings' ? 'text-sky-400' : 'text-sky-500/70')
                      : activeTab === 'settings'
                      ? (isDark ? 'text-white' : 'text-zinc-950')
                      : isDark ? 'text-zinc-400' : 'text-zinc-500'
                  }`} />
                  <span>Server Join</span>
                  {activeTab === 'settings' && (
                    <motion.div
                      layoutId="bot-view-tab-pill"
                      className={`absolute inset-0 rounded-xl -z-10 border transition-shadow duration-300 ${
                        isColourUI
                          ? dockTabConfig.settings.pillClass
                          : isDark
                          ? 'bg-zinc-800 border-zinc-600 shadow-sm'
                          : 'bg-zinc-100 border-zinc-300 shadow-sm'
                      }`}
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                </motion.button>
              </div>

              {/* Subtle separator on sm: */}
              <div className={`hidden sm:block w-px h-6 shrink-0 mx-1 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

              {/* Right: The 2 Action Buttons */}
              <div className={`flex items-center gap-1.5 w-full sm:w-auto shrink-0 justify-between sm:justify-end pt-1 sm:pt-0 border-t sm:border-t-0 ${
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              }`}>
                <motion.button
                  id="btn-nether-calc-control"
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setIsNetherCalcOpen(true)}
                  className={`flex-1 sm:flex-initial py-2 px-2.5 sm:px-3 border rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap ${
                    isColourUI
                      ? 'bg-purple-950/70 hover:bg-purple-900/90 text-purple-200 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                      : isDark
                      ? 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                  }`}
                  title="Nether Portal Link Calculator"
                >
                  <Compass className={`w-3.5 h-3.5 shrink-0 ${isColourUI ? 'text-fuchsia-400' : 'text-zinc-400'}`} />
                  <span>Nether Calc</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setIsWorkspaceOpen(true)}
                  className={`flex-1 sm:flex-initial py-2 px-2.5 sm:px-4 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap ${
                    isColourUI
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sky-500/20 border border-sky-400/40'
                      : isDark
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-black/40'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20'
                  }`}
                  title="Open 3D Workspace (Beta)"
                >
                  <Play className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                  <span>3D Workspace</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400 text-zinc-950 font-mono font-black uppercase tracking-wider shadow-xs">
                    BETA
                  </span>
                </motion.button>
              </div>
            </div>

            {/* Active Bot Main Dashboard View */}
            {activeBot ? (
              <div className="space-y-6">
                {/* Top Bot HUD */}
                <BotHud
                  bot={activeBot}
                  onStart={handleStartBot}
                  onStop={handleStopBot}
                  onRestart={handleRestartBot}
                  onEdit={(b) => {
                    setEditingBot(b);
                    setIsModalOpen(true);
                  }}
                  onDelete={handleDeleteBot}
                  onToggleAntiAfk={handleToggleAntiAfk}
                  onToggleAutoReconnect={handleToggleAutoReconnect}
                  onOpenNetherCalc={() => setIsNetherCalcOpen(true)}
                  isAdmin={Boolean(currentUser?.isAdmin)}
                />

                {/* Animated Views based on activeTab */}
                <AnimatePresence mode="wait">
                  {activeTab === 'hud_chat' && (
                    <motion.div
                      key="view-hud-chat"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="space-y-6"
                    >
                      <ChatConsole
                        chatHistory={activeBot.chatHistory}
                        botUsername={activeBot.config.username}
                        isOnline={activeBot.status === 'online'}
                        botStatus={activeBot.status}
                        quickCommands={botDefaults.quickCommands}
                        onSendMessage={handleSendMessage}
                        onClearChat={handleClearChat}
                        onOpenQuickMessagesSettings={() => setIsDefaultsOpen(true)}
                      />

                      <PlayersWidget
                        players={activeBot.playersNearby}
                        botUsername={activeBot.config.username}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'anti_afk' && (
                    <motion.div
                      key="view-anti-afk"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="space-y-6 max-w-3xl mx-auto"
                    >
                      <AntiAfkCard
                        config={activeBot.config.antiAfk}
                        isOnline={activeBot.status === 'online'}
                        botId={activeBot.id}
                        onUpdateConfig={(updated) => handleSaveBotConfig({ antiAfk: updated })}
                        onTriggerTestMove={handleTriggerTestMove}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'settings' && (
                    <motion.div
                      key="view-server-join"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="space-y-6 max-w-3xl mx-auto"
                    >
                      <ConnectionSettingsCard
                        config={activeBot.config}
                        isOnline={activeBot.status === 'online'}
                        onSaveConfig={handleSaveBotConfig}
                      />

                      <div className={`border rounded-2xl p-4 text-xs space-y-2 transition-colors ${
                        isDark ? 'bg-zinc-900/50 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'
                      }`}>
                        <div className="flex items-center gap-2 font-bold">
                          <Info className="w-4 h-4 text-zinc-400" />
                          <span>Ninimo 24/7 Private Hosting</span>
                        </div>
                        <p className={`leading-relaxed text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          Ninimo runs your Mineflayer bot continuously in the background. The auto-reconnect engine automatically detects kicks, restarts, or timeouts and rejoins with your configured on-join login command. All changes are saved to your account.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className={`border rounded-3xl p-12 text-center space-y-4 shadow-xl mt-8 transition-colors ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-zinc-200/50'
              }`}>
                <Server className="w-12 h-12 text-zinc-500 mx-auto" />
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>No Bot Profiles in Your Account</h3>
                <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Create your first 24/7 Minecraft bot to connect to cracked or premium servers with anti-AFK movement and live chat.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  onClick={() => setIsModalOpen(true)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-zinc-100 hover:bg-white text-zinc-950 shadow-black/40'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-zinc-300'
                  }`}
                >
                  Add First Bot
                </motion.button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal for Creating / Editing Bots */}
      <AnimatePresence>
        {isModalOpen && (
          <BotModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleCreateOrUpdateModal}
            initialBot={editingBot}
            userDefaults={botDefaults}
          />
        )}
      </AnimatePresence>

      {/* Nether Portal Calculator Tool Modal */}
      <AnimatePresence>
        {isNetherCalcOpen && (
          <NetherPortalCalculator
            isOpen={isNetherCalcOpen}
            onClose={() => setIsNetherCalcOpen(false)}
            activeBot={activeBot}
          />
        )}
      </AnimatePresence>

      {/* Bot Presets & Defaults Modal */}
      <AnimatePresence>
        {isDefaultsOpen && (
          <BotDefaultsModal
            isOpen={isDefaultsOpen}
            onClose={() => setIsDefaultsOpen(false)}
            currentDefaults={botDefaults}
            onSaveDefaults={handleSaveDefaults}
          />
        )}
      </AnimatePresence>

      {/* Real Login and Sign Up Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            initialMode={authModalMode}
            onClose={() => setIsAuthModalOpen(false)}
            quickLoginUser={quickLoginUser}
            onQuickLogin={handleQuickLogin}
            isQuickLoggingIn={isQuickLoggingIn}
            onForgetQuickLogin={handleForgetQuickLogin}
            onSuccess={(user, token, quickToken) => {
              setBots([]);
              setSelectedBotId(null);
              setEditingBot(null);
              saveQuickLoginProfile(user, quickToken);
              setCurrentUser(user);
              setIsAuthModalOpen(false);
              showToast(`Welcome to Ninimo, ${user.username}!`);
              setIsBotsLoading(true);
              fetchBots(user);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWorkspaceOpen && activeBot && (
          <BotWorkspace
            activeBot={activeBot}
            onClose={() => setIsWorkspaceOpen(false)}
            onUpdateConfig={handleSaveBotConfig}
            onStopBot={() => handleStopBot(activeBot.id)}
            onStartBot={() => handleStartBot(activeBot.id)}
            onClearChat={handleClearChat}
            onSendChat={handleSendMessage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
