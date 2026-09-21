import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Users,
  Bot as BotIcon,
  Sliders,
  LogIn,
  Play,
  Square,
  Trash2,
  Search,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Zap,
  Eye,
  EyeOff,
  Copy,
  Check,
  Key,
  Radio,
  Power,
  RotateCcw,
  Sparkles,
  Server,
  Layers,
  Filter,
  UserPlus,
  MessageSquare,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { AdminAccountInfo, User, ChatConfig } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { deleteUserFromFirestore } from '../lib/firebase';

interface AdminPageProps {
  currentUser: User;
  onBackToDashboard: () => void;
  onImpersonate: (token: string, user: User) => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

type TabType = 'accounts' | 'broadcast' | 'system';

export const AdminPage: React.FC<AdminPageProps> = ({
  currentUser,
  onBackToDashboard,
  onImpersonate,
  authFetch,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'classic-green';
  const isGreen = theme === 'classic-green';

  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [accounts, setAccounts] = useState<AdminAccountInfo[]>([]);
  const [globalBotLimit, setGlobalBotLimit] = useState<number>(1);
  const [newLimitInput, setNewLimitInput] = useState<string>('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admins' | 'active_bots'>('all');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Credential inspection & management state
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resetModalUser, setResetModalUser] = useState<AdminAccountInfo | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<AdminAccountInfo | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Admin Account Creation State
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');

  // Ping Tool State
  const [pingHost, setPingHost] = useState('');
  const [pingPort, setPingPort] = useState('25565');
  const [pingResult, setPingResult] = useState<{
    online: boolean;
    host: string;
    port: number;
    latencyMs: number | null;
    statusMessage: string;
  } | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  // Broadcast Tool State
  const [broadcastTitle, setBroadcastTitle] = useState('System Announcement');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Chat Administration State
  const [chatConfig, setChatConfig] = useState<ChatConfig>({ allowImages: true, maxMessageLength: 500, maxImageSizeMb: 5 });

  // Upstash Cloud State
  const [upstashStatus, setUpstashStatus] = useState<{
    ok: boolean;
    latencyMs?: number;
    error?: string;
    configured?: boolean;
    storageDirectory?: string;
    dataDirectory?: string;
    host?: string;
  } | null>(null);
  const [isCheckingUpstash, setIsCheckingUpstash] = useState(false);
  const [isSyncingUpstash, setIsSyncingUpstash] = useState(false);

  const checkUpstashHealth = async () => {
    setIsCheckingUpstash(true);
    try {
      const res = await authFetch('/api/upstash/status');
      if (res.ok) {
        const data = await res.json();
        setUpstashStatus(data);
      } else {
        setUpstashStatus({ ok: false, error: 'Could not connect to Redis' });
      }
    } catch (err: any) {
      setUpstashStatus({ ok: false, error: err.message });
    } finally {
      setIsCheckingUpstash(false);
    }
  };

  const syncUpstashCloud = async () => {
    setIsSyncingUpstash(true);
    try {
      const res = await authFetch('/api/admin/upstash/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      notifySuccess('Cloud synchronization successful! All accounts, bots, and sessions backed up to Upstash.');
      await checkUpstashHealth();
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setIsSyncingUpstash(false);
    }
  };

  const fetchChatConfig = async () => {
    try {
      const res = await authFetch('/api/chat/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) setChatConfig(data.config);
      }
    } catch {
      // Ignore
    }
  };

  const handleToggleChatImages = async (allow: boolean) => {
    setActionLoading('chat-images');
    try {
      const res = await authFetch('/api/admin/chat/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowImages: allow }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update chat settings');
      setChatConfig(data.config);
      notifySuccess(`Chat image uploads ${allow ? 'ENABLED' : 'DISABLED'} successfully!`);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle image uploads');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearAllChat = async () => {
    // window.confirm blocked in iframe
    setActionLoading('chat-clear');
    try {
      const res = await authFetch('/api/admin/chat/clear', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear chat');
      try {
        localStorage.removeItem('ninimo_general_chat_cache');
      } catch {}
      notifySuccess('All general chat messages cleared.');
    } catch (err: any) {
      setError(err.message || 'Failed to clear chat');
    } finally {
      setActionLoading(null);
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/admin/accounts');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load administrator accounts data');
      }
      const data = await res.json();
      setAccounts(data.accounts || []);
      if (typeof data.globalBotLimit === 'number') {
        setGlobalBotLimit(data.globalBotLimit);
        setNewLimitInput(String(data.globalBotLimit));
      }
      await fetchChatConfig();
      await checkUpstashHealth();
    } catch (err: any) {
      setError(err.message || 'Error loading admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleUpdateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseInt(newLimitInput, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      setError('Bot limit must be a positive integer between 1 and 100');
      return;
    }

    setActionLoading('limit');
    setError(null);
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalBotLimit: limitNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update limit');

      setGlobalBotLimit(data.globalBotLimit);
      notifySuccess(`Global bot limit updated to ${data.globalBotLimit} bot(s) per account!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePingServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pingHost.trim()) {
      setError('Please enter a server host to ping.');
      return;
    }

    setIsPinging(true);
    setPingResult(null);
    setError(null);
    try {
      const res = await authFetch('/api/admin/ping-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: pingHost.trim(),
          port: parseInt(pingPort, 10) || 25565,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ping diagnostic failed');
      setPingResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPinging(false);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      setError('Notification title and body are required.');
      return;
    }

    setIsBroadcasting(true);
    setError(null);
    try {
      const res = await authFetch('/api/admin/broadcast-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Broadcast failed');
      notifySuccess('Notification sent to all active users!');
      setBroadcastBody('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleMassFleet = async (action: 'start_all' | 'stop_all' | 'reconnect_all') => {
    // window.confirm blocked in iframe
    setActionLoading(`mass-${action}`);
    setError(null);
    try {
      const res = await authFetch('/api/admin/mass-fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fleet action failed');
      notifySuccess(data.message || 'Mass fleet action triggered!');
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleRevealPassword = (userId: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleUpdateUserPassword = async (userId: string, newPassword: string) => {
    if (!newPassword || newPassword.length < 3) {
      setError('Password must be at least 3 characters');
      return;
    }
    setActionLoading(`pwd-${userId}`);
    setError(null);
    try {
      const res = await authFetch(`/api/admin/accounts/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      notifySuccess(`Password updated successfully!`);
      setResetModalUser(null);
      setResetNewPassword('');
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUsername.trim() || !createEmail.trim() || !createPassword.trim()) {
      setError('Username, email, and password are required.');
      return;
    }
    setActionLoading('create_account');
    setError(null);
    try {
      const res = await authFetch('/api/admin/accounts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: createUsername.trim(),
          email: createEmail.trim(),
          password: createPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user account');

      notifySuccess(`User account "${data.user.username}" created successfully!`);
      setShowCreateAccountModal(false);
      setCreateUsername('');
      setCreateEmail('');
      setCreatePassword('');
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonateUser = async (targetUserId: string, username: string) => {
    // window.confirm blocked in iframe

    setActionLoading(`impersonate-${targetUserId}`);
    setError(null);
    try {
      const res = await authFetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to impersonate user');

      onImpersonate(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
      setActionLoading(null);
    }
  };

  const executeDeleteAccount = async (targetUserId: string) => {
    setActionLoading(`delete-${targetUserId}`);
    setError(null);
    try {
      const res = await authFetch(`/api/admin/accounts/${encodeURIComponent(targetUserId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user account');

      // Also clean up from Firestore if mirrored
      deleteUserFromFirestore(targetUserId).catch(() => {});

      notifySuccess(data.message || 'Account deleted successfully.');
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBotAction = async (botId: string, action: 'start' | 'stop' | 'delete') => {
    // window.confirm blocked in iframe

    setActionLoading(`${action}-${botId}`);
    try {
      const method = action === 'delete' ? 'DELETE' : 'POST';
      const endpoint = action === 'delete' ? `/api/admin/bots/${botId}` : `/api/admin/bots/${botId}/${action}`;
      const res = await authFetch(endpoint, { method });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action} bot`);
      }
      notifySuccess(`Bot ${action}ed successfully.`);
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = (
      acc.username.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      acc.bots.some((b) => b.name.toLowerCase().includes(q) || b.username.toLowerCase().includes(q) || b.host.toLowerCase().includes(q))
    );

    if (!matchesQuery) return false;

    if (filterRole === 'admins') return acc.isAdmin;
    if (filterRole === 'active_bots') return acc.bots.some(b => b.status === 'online');

    return true;
  });

  const totalBots = accounts.reduce((acc, curr) => acc + curr.botCount, 0);
  const activeBots = accounts.reduce(
    (acc, curr) => acc + curr.bots.filter((b) => b.status === 'online').length,
    0
  );

  // Styling helper function based on active theme
  const getCardBg = () => {
    if (isGreen) return 'bg-[#0b131e]/90 border-emerald-900/60 shadow-emerald-950/30';
    if (isDark) return 'bg-zinc-900/80 border-zinc-800 shadow-black/40 backdrop-blur-md';
    return 'bg-white border-slate-200/90 shadow-slate-200/60';
  };

  const getInputBg = () => {
    if (isGreen) return 'bg-[#080d14] border-emerald-900/80 text-emerald-100 placeholder-emerald-700 focus:border-emerald-500';
    if (isDark) return 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-indigo-500';
    return 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500';
  };

  return (
    <div className={`space-y-6 max-w-7xl mx-auto pb-12 transition-colors duration-200 ${
      isGreen ? 'text-emerald-100' : isDark ? 'text-zinc-100' : 'text-slate-800'
    }`}>
      {/* Cool Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`border rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all ${getCardBg()}`}
      >
        {/* Subtle Ambient Background Glow */}
        <div className={`absolute -right-12 -top-12 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isGreen ? 'bg-emerald-500' : isDark ? 'bg-indigo-500' : 'bg-blue-400'
        }`} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border shrink-0 ${
              isGreen 
                ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400 shadow-emerald-900/30'
                : isDark 
                ? 'bg-zinc-800/90 border-zinc-700 text-indigo-400 shadow-indigo-950/20' 
                : 'bg-indigo-50 border-indigo-100 text-indigo-600 shadow-indigo-100'
            }`}>
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className={`text-2xl font-black tracking-tight ${
                  isGreen ? 'text-emerald-50' : isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Control Center
                </h1>
                <span className={`px-3 py-0.5 rounded-full text-xs font-mono font-bold border shadow-xs ${
                  isGreen 
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800' 
                    : isDark 
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700' 
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  <Sparkles className="w-3 h-3 inline mr-1 text-amber-400" />
                  {currentUser.username}
                </span>
              </div>
              <p className={`text-xs mt-1 ${isGreen ? 'text-emerald-400/80' : isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Superadmin account governance, real-time broadcasts, and server infrastructure.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <ThemeToggle showLabel />

            <button
              id="admin-refresh-btn"
              onClick={fetchAdminData}
              disabled={loading}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border cursor-pointer active:scale-95 ${
                isGreen
                  ? 'bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-200 border-emerald-700/50'
                  : isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync
            </button>

            <button
              id="admin-back-btn"
              onClick={onBackToDashboard}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-md active:scale-95 ${
                isGreen
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 border-emerald-400 font-extrabold'
                  : isDark
                  ? 'bg-white hover:bg-zinc-100 text-zinc-950 border-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Exit Panel
            </button>
          </div>
        </div>
      </motion.div>

      {/* Notifications Bar */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="err"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-2xl flex items-center gap-3 text-xs font-medium border bg-rose-500/10 border-rose-500/30 text-rose-400 backdrop-blur-md shadow-lg"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="hover:underline font-bold text-rose-300">
              Dismiss
            </button>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            key="succ"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-2xl flex items-center gap-3 text-xs font-medium border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 backdrop-blur-md shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="flex-1">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <motion.div 
          whileHover={{ y: -2 }}
          className={`border rounded-2xl p-4.5 shadow-lg flex items-center gap-4 transition-all ${getCardBg()}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
            isGreen 
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-400' 
              : isDark 
              ? 'bg-zinc-800 border-zinc-700 text-indigo-400' 
              : 'bg-indigo-50 border-indigo-100 text-indigo-600'
          }`}>
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight">
              {accounts.length}
            </div>
            <div className={`text-xs font-medium ${isGreen ? 'text-emerald-400/70' : isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Registered Accounts
            </div>
          </div>
        </motion.div>

        {/* Metric 2 */}
        <motion.div 
          whileHover={{ y: -2 }}
          className={`border rounded-2xl p-4.5 shadow-lg flex items-center gap-4 transition-all ${getCardBg()}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
            isGreen 
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-400' 
              : isDark 
              ? 'bg-zinc-800 border-zinc-700 text-emerald-400' 
              : 'bg-emerald-50 border-emerald-100 text-emerald-600'
          }`}>
            <BotIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight flex items-baseline gap-1.5">
              <span>{activeBots}</span>
              <span className={`text-xs font-normal ${isGreen ? 'text-emerald-500' : 'text-zinc-500'}`}>/ {totalBots} active</span>
            </div>
            <div className={`text-xs font-medium ${isGreen ? 'text-emerald-400/70' : isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Minecraft Fleet
            </div>
          </div>
        </motion.div>

        {/* Metric 3 */}
        <motion.div 
          whileHover={{ y: -2 }}
          className={`border rounded-2xl p-4.5 shadow-lg flex items-center gap-4 transition-all ${getCardBg()}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
            isGreen 
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-400' 
              : isDark 
              ? 'bg-zinc-800 border-zinc-700 text-amber-400' 
              : 'bg-amber-50 border-amber-100 text-amber-600'
          }`}>
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight">
              {globalBotLimit} <span className="text-xs font-normal text-zinc-500">bots/user</span>
            </div>
            <div className={`text-xs font-medium ${isGreen ? 'text-emerald-400/70' : isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Account Limit Cap
            </div>
          </div>
        </motion.div>

        {/* Metric 4 */}
        <motion.div 
          whileHover={{ y: -2 }}
          className={`border rounded-2xl p-4.5 shadow-lg flex items-center gap-4 transition-all ${getCardBg()}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
            isGreen 
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-400' 
              : isDark 
              ? 'bg-zinc-800 border-zinc-700 text-rose-400' 
              : 'bg-rose-50 border-rose-100 text-rose-600'
          }`}>
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </div>
            <div className={`text-xs font-medium ${isGreen ? 'text-emerald-400/70' : isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              System Host Status
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className={`p-1.5 rounded-2xl border flex items-center gap-2 overflow-x-auto shadow-md ${
        isGreen 
          ? 'bg-[#080d14] border-emerald-900/60' 
          : isDark 
          ? 'bg-zinc-900/90 border-zinc-800' 
          : 'bg-slate-200/60 border-slate-300'
      }`}>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
            activeTab === 'accounts'
              ? isGreen
                ? 'bg-emerald-600 text-zinc-950 shadow-lg shadow-emerald-600/30'
                : isDark
                ? 'bg-zinc-800 text-white shadow-lg'
                : 'bg-white text-slate-900 shadow-sm'
              : isGreen
              ? 'text-emerald-400/70 hover:text-emerald-200'
              : isDark
              ? 'text-zinc-400 hover:text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & Fleet ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
            activeTab === 'broadcast'
              ? isGreen
                ? 'bg-emerald-600 text-zinc-950 shadow-lg shadow-emerald-600/30'
                : isDark
                ? 'bg-zinc-800 text-white shadow-lg'
                : 'bg-white text-slate-900 shadow-sm'
              : isGreen
              ? 'text-emerald-400/70 hover:text-emerald-200'
              : isDark
              ? 'text-zinc-400 hover:text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>System Broadcast</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
            activeTab === 'system'
              ? isGreen
                ? 'bg-emerald-600 text-zinc-950 shadow-lg shadow-emerald-600/30'
                : isDark
                ? 'bg-zinc-800 text-white shadow-lg'
                : 'bg-white text-slate-900 shadow-sm'
              : isGreen
              ? 'text-emerald-400/70 hover:text-emerald-200'
              : isDark
              ? 'text-zinc-400 hover:text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>System Controls</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'accounts' && (
          <motion.div
            key="tab-accounts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Search and Filters Header */}
            <div className={`border rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 ${getCardBg()}`}>
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user, email, IP or bot..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none transition-colors ${getInputBg()}`}
                />
              </div>

              {/* Filter Pills & Create Account Action */}
              <div className="flex items-center gap-2 self-end sm:self-auto overflow-x-auto w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0 mr-1" />
                <button
                  onClick={() => setFilterRole('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterRole === 'all'
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({accounts.length})
                </button>
                <button
                  onClick={() => setFilterRole('admins')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterRole === 'admins'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Admins ({accounts.filter(a => a.isAdmin).length})
                </button>
                <button
                  onClick={() => setFilterRole('active_bots')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterRole === 'active_bots'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Has Active Bots ({accounts.filter(a => a.bots.some(b => b.status === 'online')).length})
                </button>

                <button
                  onClick={() => setShowCreateAccountModal(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-1 shadow-sm ${
                    isGreen
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-zinc-950 border border-emerald-400'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>New Account</span>
                </button>
              </div>
            </div>

            {/* Account Cards */}
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-zinc-400 gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-xs font-medium">Syncing account directory...</p>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl border ${getCardBg()}`}>
                <p className="text-xs text-zinc-500 font-medium">No accounts found matching search filter.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAccounts.map((account) => {
                  const isCurrentAdmin = account.id === currentUser.id;

                  return (
                    <motion.div
                      layout
                      key={account.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`rounded-2xl border p-5 transition-all shadow-lg ${
                        account.isAdmin
                          ? isGreen
                            ? 'bg-[#0a1622] border-emerald-700/60'
                            : isDark
                            ? 'bg-zinc-900/90 border-amber-500/30'
                            : 'bg-amber-50/50 border-amber-200'
                          : getCardBg()
                      }`}
                    >
                      {/* User Top Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-3">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-black text-sm shadow-md shrink-0 overflow-hidden ${
                            account.isAdmin
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : isGreen
                              ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                              : isDark
                              ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                              : 'bg-slate-100 border-slate-300 text-slate-800'
                          }`}>
                            {account.photoURL ? (
                              <img
                                src={account.photoURL}
                                alt={account.username}
                                className="w-full h-full object-cover rounded-2xl"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              account.username.slice(0, 2).toUpperCase()
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-extrabold tracking-tight">
                                {account.username}
                              </span>
                              {account.isAdmin && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  Admin
                                </span>
                              )}
                              {isCurrentAdmin && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                  You
                                </span>
                              )}
                            </div>

                            <div className={`text-xs font-mono flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-0.5 ${
                              isGreen ? 'text-emerald-400/70' : isDark ? 'text-zinc-400' : 'text-slate-500'
                            }`}>
                              <span>{account.email}</span>
                              <span>•</span>
                              <span>Joined: {new Date(account.createdAt).toLocaleDateString()}</span>
                              {account.registrationIp && account.registrationIp !== 'unknown' && (
                                <>
                                  <span>•</span>
                                  <span className="opacity-75">IP: {account.registrationIp}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          {!isCurrentAdmin && (
                            <>
                              <button
                                id={`impersonate-${account.id}`}
                                onClick={() => handleImpersonateUser(account.id, account.username)}
                                disabled={actionLoading === `impersonate-${account.id}`}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border active:scale-95 ${
                                  isGreen
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-zinc-950 border-emerald-500'
                                    : isDark
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
                                    : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                                }`}
                              >
                                <LogIn className="w-3.5 h-3.5" />
                                {actionLoading === `impersonate-${account.id}` ? 'Switching...' : 'Log in as User'}
                              </button>

                              <button
                                id={`delete-account-${account.id}`}
                                onClick={() => setDeleteModalUser(account)}
                                disabled={actionLoading === `delete-${account.id}`}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 active:scale-95"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {actionLoading === `delete-${account.id}` ? 'Deleting...' : 'Delete'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Credentials Strip */}
                      <div className={`mt-3.5 p-3 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                        isGreen ? 'bg-[#080e18] border-emerald-900/60' : isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-100/90 border-slate-200'
                      }`}>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                          {/* Email copy */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email:</span>
                            <span className="font-semibold">{account.email}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(account.email, `email-${account.id}`)}
                              className="p-1 rounded hover:bg-white/10 text-zinc-400 transition-colors"
                              title="Copy Email"
                            >
                              {copiedKey === `email-${account.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <span className="text-zinc-700 hidden md:inline">|</span>

                          {/* Password Inspector */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Password:</span>
                            {account.password ? (
                              <>
                                <span className={`font-semibold px-2 py-0.5 rounded border select-all ${
                                  isDark ? 'bg-zinc-900 border-zinc-800 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600'
                                }`}>
                                  {revealedPasswords[account.id] ? account.password : '••••••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleRevealPassword(account.id)}
                                  className="p-1 rounded hover:bg-white/10 text-zinc-400 transition-colors"
                                  title={revealedPasswords[account.id] ? "Hide Password" : "Show Password"}
                                >
                                  {revealedPasswords[account.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(account.password!, `pwd-${account.id}`)}
                                  className="p-1 rounded hover:bg-white/10 text-zinc-400 transition-colors"
                                  title="Copy Password"
                                >
                                  {copiedKey === `pwd-${account.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </>
                            ) : (
                              <span className="text-zinc-500 italic text-[11px]">Hashed (Click set pass to update)</span>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setResetModalUser(account);
                              setResetNewPassword(account.password || '');
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                              isGreen ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800' : isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                            }`}
                          >
                            <Key className="w-3.5 h-3.5 text-amber-400" />
                            <span>{account.password ? 'Change Pass' : 'Set Pass'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Account Bots Grid */}
                      <div className="mt-4">
                        <div className={`text-xs font-bold mb-2.5 flex items-center gap-2 ${
                          isGreen ? 'text-emerald-400' : isDark ? 'text-zinc-400' : 'text-slate-600'
                        }`}>
                          <BotIcon className="w-3.5 h-3.5" />
                          <span>Assigned Bots ({account.bots.length}/{globalBotLimit})</span>
                        </div>

                        {account.bots.length === 0 ? (
                          <p className="text-xs text-zinc-500 italic py-2">No bots configured yet for this user account.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {account.bots.map((bot) => (
                              <div
                                key={bot.id}
                                className={`border rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm ${
                                  isGreen ? 'bg-[#080d14] border-emerald-900/60' : isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-lg border border-zinc-700/50 p-0.5 shrink-0 overflow-hidden flex items-center justify-center bg-zinc-900">
                                    <img
                                      src={`https://mc-heads.net/avatar/${encodeURIComponent(bot.username)}/48`}
                                      alt={bot.username}
                                      className="w-full h-full rounded object-cover pixelated"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                      <span className="truncate">{bot.name || bot.username}</span>
                                      <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                          bot.status === 'online'
                                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                                            : bot.status === 'reconnecting'
                                            ? 'bg-amber-400 animate-pulse'
                                            : 'bg-zinc-600'
                                        }`}
                                      />
                                    </div>
                                    <div className="text-[11px] font-mono truncate text-zinc-500">
                                      {bot.host}:{bot.port}
                                    </div>
                                  </div>
                                </div>

                                {/* Bot Controls */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {bot.status === 'online' ? (
                                    <button
                                      title="Stop Bot"
                                      onClick={() => handleBotAction(bot.id, 'stop')}
                                      disabled={actionLoading === `stop-${bot.id}`}
                                      className="p-1.5 rounded-lg border bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700 transition-colors"
                                    >
                                      <Square className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      title="Start Bot"
                                      onClick={() => handleBotAction(bot.id, 'start')}
                                      disabled={actionLoading === `start-${bot.id}`}
                                      className="p-1.5 rounded-lg border bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 transition-colors shadow-xs"
                                    >
                                      <Play className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    title="Delete Bot"
                                    onClick={() => handleBotAction(bot.id, 'delete')}
                                    disabled={actionLoading === `delete-${bot.id}`}
                                    className="p-1.5 rounded-lg border bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab 2: Broadcast */}
        {activeTab === 'broadcast' && (
          <motion.div
            key="tab-broadcast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`border rounded-3xl p-6 shadow-xl space-y-6 ${getCardBg()}`}
          >
            <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold">Push Broadcast Console</h2>
                <p className="text-xs text-zinc-400">
                  Send real-time alerts and native Chrome/Mobile push notifications directly to all connected users.
                </p>
              </div>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-zinc-300">Notification Title</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="System Update / Maintenance Notice"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none transition-colors ${getInputBg()}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-zinc-300">Notification Content</label>
                <textarea
                  required
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Type your message here... e.g. 'Server restarted with new Mineflayer plugins! All bots auto-reconnected.'"
                  rows={4}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors resize-none ${getInputBg()}`}
                />
              </div>

              <button
                type="submit"
                disabled={isBroadcasting || !broadcastTitle.trim() || !broadcastBody.trim()}
                className={`px-6 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 w-full transition-all shadow-lg active:scale-98 cursor-pointer ${
                  isBroadcasting || !broadcastTitle.trim() || !broadcastBody.trim()
                    ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 border border-indigo-500 font-extrabold'
                }`}
              >
                {isBroadcasting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Radio className="w-4 h-4" />
                )}
                {isBroadcasting ? 'Broadcasting to Active Clients...' : 'Broadcast Push Notification Now'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Tab 3: System Controls */}
        {activeTab === 'system' && (
          <motion.div
            key="tab-system"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Account Bot Limit Settings */}
            <div className={`border rounded-3xl p-6 shadow-xl space-y-4 ${getCardBg()}`}>
              <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Global Active Bot Limit Quota</h3>
                  <p className="text-xs text-zinc-400">Configure total active bots a user can run across their accounts.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateLimit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-300">Max Active Running Bots Per User Quota</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newLimitInput}
                      onChange={(e) => setNewLimitInput(e.target.value)}
                      className={`w-32 border rounded-xl px-4 py-2 font-mono font-bold text-base focus:outline-none ${getInputBg()}`}
                    />
                    <button
                      type="submit"
                      disabled={actionLoading === 'limit'}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 border border-amber-400 shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      {actionLoading === 'limit' ? 'Updating...' : 'Apply Quota'}
                    </button>
                  </div>
                </div>
                <div className="text-xs text-zinc-500 leading-relaxed space-y-1 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/50">
                  <p className="font-semibold text-zinc-400">Quota Pooling Rules:</p>
                  <p>• Users can create multiple accounts and flexibly distribute their active bots (e.g., if set to 2: run 1 bot in Account A and 1 bot in Account B, or 2 bots in Account A; if set to 5: run 1 bot across 5 accounts, 5 bots on 1 account, or any combination).</p>
                  <p>• <strong>Admin accounts</strong> have unrestricted access (unlimited account creations and unlimited running bots).</p>
                </div>
              </form>
            </div>

            {/* Mass Fleet Actions */}
            <div className={`border rounded-3xl p-6 shadow-xl space-y-4 ${getCardBg()}`}>
              <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Mass Fleet Controls</h3>
                  <p className="text-xs text-zinc-400">Trigger global commands across all user bots across the platform.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => handleMassFleet('start_all')}
                  disabled={actionLoading === 'mass-start_all'}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between border bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 transition-all cursor-pointer active:scale-98"
                >
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Start All User Bots
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-mono bg-emerald-500/20 px-2 py-0.5 rounded">Bulk Start</span>
                </button>

                <button
                  onClick={() => handleMassFleet('reconnect_all')}
                  disabled={actionLoading === 'mass-reconnect_all'}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between border bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 transition-all cursor-pointer active:scale-98"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Reconnect All Bots
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-mono bg-amber-500/20 px-2 py-0.5 rounded">Bulk Reconnect</span>
                </button>

                <button
                  onClick={() => handleMassFleet('stop_all')}
                  disabled={actionLoading === 'mass-stop_all'}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between border bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 transition-all cursor-pointer active:scale-98"
                >
                  <span className="flex items-center gap-2">
                    <Square className="w-4 h-4" />
                    Stop All Active Bots
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-mono bg-rose-500/20 px-2 py-0.5 rounded">Bulk Stop</span>
                </button>
              </div>
            </div>

            {/* General Chat Controls Card */}
            <div className={`md:col-span-2 border rounded-3xl p-6 shadow-xl space-y-4 ${getCardBg()}`}>
              <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">General Chat Settings & Moderation</h3>
                    <p className="text-xs text-zinc-400">Configure global community chat permissions and image attachment toggles.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAllChat}
                    disabled={actionLoading === 'chat-clear'}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{actionLoading === 'chat-clear' ? 'Clearing...' : 'Purge All Chat'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Image Upload Toggle Card */}
                <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${
                      chatConfig.allowImages 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                    }`}>
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-2">
                        <span>Allow Image Attachments</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          chatConfig.allowImages
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {chatConfig.allowImages ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {chatConfig.allowImages
                          ? 'Users can upload and embed image attachments in chat.'
                          : 'Image uploads are blocked for non-admin users.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={actionLoading === 'chat-images'}
                    onClick={() => handleToggleChatImages(!chatConfig.allowImages)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      chatConfig.allowImages ? 'bg-emerald-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        chatConfig.allowImages ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Info Card */}
                <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 flex items-center gap-3 text-xs text-zinc-400">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-zinc-200">Global Chat Persistence</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Messages are permanently stored in the server storage and synchronized across all active themes.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Server Ping Diagnostic Tool */}
            <div className={`md:col-span-2 border rounded-3xl p-6 shadow-xl space-y-4 ${getCardBg()}`}>
              <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Minecraft Server Network Diagnostic</h3>
                  <p className="text-xs text-zinc-400">Ping any external Minecraft server host to diagnose connection latency.</p>
                </div>
              </div>

              <form onSubmit={handlePingServer} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    placeholder="Server host (e.g. mc.hypixel.net, node.aternos.me)"
                    value={pingHost}
                    onChange={(e) => setPingHost(e.target.value)}
                    className={`flex-1 border rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none ${getInputBg()}`}
                  />
                  <input
                    type="text"
                    placeholder="25565"
                    value={pingPort}
                    onChange={(e) => setPingPort(e.target.value)}
                    className={`w-full sm:w-28 border rounded-xl px-3 py-2.5 text-xs font-mono text-center focus:outline-none ${getInputBg()}`}
                  />
                  <button
                    type="submit"
                    disabled={isPinging}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {isPinging ? 'Pinging...' : 'Ping Server'}
                  </button>
                </div>

                {pingResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                      pingResult.online
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    <span>{pingResult.statusMessage}</span>
                    {pingResult.latencyMs !== null && (
                      <span className="font-bold bg-zinc-900 border border-zinc-700 px-2.5 py-1 rounded text-white">
                        {pingResult.latencyMs} ms
                      </span>
                    )}
                  </motion.div>
                )}
              </form>
            </div>

            {/* Firebase & Google Sign-In Project Branding Card */}
            <div className={`md:col-span-2 border rounded-3xl p-6 shadow-xl space-y-4 ${getCardBg()}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      Firebase & Google Sign-In Branding
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        Ninimo AFK Active
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Connected to dedicated project <code className="text-amber-400 font-mono">ninimo-afk</code>. Google sign-in popups display Ninimo AFK.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <span className="text-[11px] text-zinc-500 block font-medium">Active Project ID</span>
                  <span className="font-mono font-bold text-zinc-200">ninimo-afk</span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <span className="text-[11px] text-zinc-500 block font-medium">Auth Domain</span>
                  <span className="font-mono font-bold text-zinc-200 truncate block">ninimo-afk.firebaseapp.com</span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <span className="text-[11px] text-zinc-500 block font-medium">Google Popup Display Name</span>
                  <span className="font-bold text-amber-300">Ninimo AFK</span>
                </div>
              </div>
            </div>

            {/* Upstash Redis Cloud & Protected Storage Card */}
            <div className={`md:col-span-2 border rounded-3xl p-6 shadow-xl space-y-4 ${getCardBg()}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl border ${
                    upstashStatus?.ok 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      Upstash Redis Cloud & Persistence Layer
                      {upstashStatus?.ok ? (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Online ({upstashStatus.latencyMs ?? 0}ms)
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Checking / Local Fallback
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Multi-tier fault-tolerant storage: dedicated folder (<code className="text-cyan-400 font-mono">ninimo_storage/</code>), automatic atomic backups, and Upstash Redis cloud synchronization.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={checkUpstashHealth}
                    disabled={isCheckingUpstash}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpstash ? 'animate-spin' : ''}`} />
                    <span>{isCheckingUpstash ? 'Testing...' : 'Test Status'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={syncUpstashCloud}
                    disabled={isSyncingUpstash}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isSyncingUpstash ? 'animate-spin' : ''}`} />
                    <span>{isSyncingUpstash ? 'Syncing...' : 'Sync Cloud Backup'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <span className="text-[11px] text-zinc-500 block font-medium">Primary Storage</span>
                  <span className="font-mono font-bold text-cyan-300 truncate block">ninimo_storage/</span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <span className="text-[11px] text-zinc-500 block font-medium">Backup Layer</span>
                  <span className="font-mono font-bold text-amber-300 truncate block">ninimo_storage/backups/</span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <span className="text-[11px] text-zinc-500 block font-medium">Cloud Redis Database</span>
                  <span className="font-mono font-bold text-emerald-300 truncate block">{upstashStatus?.host || 'upstash-redis'}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Delete Account</h3>
                  <p className="text-xs text-zinc-400">{deleteModalUser.username}</p>
                </div>
              </div>

              <div className="py-4 text-sm text-zinc-300">
                Are you sure you want to permanently delete <strong>{deleteModalUser.username}</strong> and all associated bots? This action cannot be undone.
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalUser(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    executeDeleteAccount(deleteModalUser.id);
                    setDeleteModalUser(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Password Reset Modal */}
      <AnimatePresence>
        {resetModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
                isGreen 
                  ? 'bg-[#0a1420] border-emerald-800 text-emerald-100' 
                  : isDark 
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-100' 
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Set Password: {resetModalUser.username}</h3>
                  <p className="text-xs text-zinc-400">{resetModalUser.email}</p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateUserPassword(resetModalUser.id, resetNewPassword);
                }}
                className="mt-4 space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-300">New Password</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    placeholder="Enter new password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 text-xs font-mono rounded-xl border focus:outline-none ${getInputBg()}`}
                  />
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    Updates both the authentication hash and plain text record for this user.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetModalUser(null);
                      setResetNewPassword('');
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === `pwd-${resetModalUser.id}`}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{actionLoading === `pwd-${resetModalUser.id}` ? 'Saving...' : 'Save Password'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Create Account Modal */}
      <AnimatePresence>
        {showCreateAccountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
                isGreen 
                  ? 'bg-[#0a1420] border-emerald-800 text-emerald-100' 
                  : isDark 
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-100' 
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Create User Account</h3>
                  <p className="text-xs text-zinc-400">Admin direct provisioning (Unlimited)</p>
                </div>
              </div>

              <form onSubmit={handleCreateAccount} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-300">Username</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    placeholder="e.g. PlayerTwo"
                    value={createUsername}
                    onChange={(e) => setCreateUsername(e.target.value)}
                    className={`w-full px-4 py-2 text-xs rounded-xl border focus:outline-none ${getInputBg()}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-300">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. player2@example.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className={`w-full px-4 py-2 text-xs rounded-xl border focus:outline-none ${getInputBg()}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-300">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Account password (min 6 chars)"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className={`w-full px-4 py-2 text-xs rounded-xl border focus:outline-none ${getInputBg()}`}
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateAccountModal(false);
                      setCreateUsername('');
                      setCreateEmail('');
                      setCreatePassword('');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === 'create_account'}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{actionLoading === 'create_account' ? 'Creating...' : 'Create Account'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
