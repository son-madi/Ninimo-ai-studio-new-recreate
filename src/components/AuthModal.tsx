import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  X,
  Sparkles,
  Zap,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { getDeviceFingerprint } from '../lib/fingerprint';
import { User, QuickLoginProfile } from '../types';
import { NinimoIcon } from './NinimoIcon';
import { useTheme } from '../context/ThemeContext';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  syncUserToFirestore,
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (user: User, token: string, quickToken?: string) => void;
  canDismiss?: boolean;
  initialMode?: 'login' | 'signup';
  quickLoginUser?: QuickLoginProfile | null;
  onQuickLogin?: () => void;
  isQuickLoggingIn?: boolean;
  onForgetQuickLogin?: () => void;
}

// Helper to safely parse API responses and prevent "Unexpected token '<', <!DOCTYPE" errors
async function safeParseResponse(res: Response): Promise<{ ok: boolean; data: any }> {
  const text = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    if (!res.ok) {
      const isHtml = text.includes('<!DOCTYPE') || text.includes('<html');
      throw new Error(
        isHtml
          ? `Server returned HTTP ${res.status} (${res.statusText || 'Error'}). Please retry in a moment.`
          : text.slice(0, 160) || `Request failed with status ${res.status}`
      );
    }
  }
  return { ok: res.ok, data };
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  canDismiss = true,
  initialMode = 'signup',
  quickLoginUser,
  onQuickLogin,
  isQuickLoggingIn = false,
  onForgetQuickLogin,
}) => {
  const { theme, isDark, isLight, isColourUI } = useTheme();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setUnauthorizedDomain(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setUnauthorizedDomain(null);
    setIsGoogleLoading(true);

    // Timeout safety fallback: if user closes the popup or switches tab and browser misses the event,
    // ensure loading spinner never gets stuck
    const loadingWatchdog = setTimeout(() => {
      setIsGoogleLoading(false);
    }, 12000);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      clearTimeout(loadingWatchdog);
      const fbUser = result.user;

      // Sync user profile to Firestore non-blockingly
      syncUserToFirestore(fbUser).catch((e) =>
        console.debug('Background Firestore sync notice:', e)
      );

      // Authenticate with server to establish Ninimo session and bot manager instance immediately
      const deviceId = getDeviceFingerprint();
      const res = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
          'X-Device-Fingerprint': deviceId,
        },
        body: JSON.stringify({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
        }),
      });

      const { ok, data } = await safeParseResponse(res);
      if (!ok) {
        throw new Error(data.error || 'Server authentication failed');
      }

      localStorage.setItem('ninimo_token', data.token);
      try {
        localStorage.setItem('ninimo_user_profile', JSON.stringify(data.user));
      } catch {}

      onSuccess(data.user, data.token, data.quickToken);
    } catch (err: any) {
      clearTimeout(loadingWatchdog);
      // Popup closed, cancelled, or user backed out - immediately reset loading without error toast
      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request' ||
        err.code === 'auth/user-cancelled' ||
        err.message?.includes('closed-by-user') ||
        err.message?.includes('cancelled')
      ) {
        setIsGoogleLoading(false);
        return;
      }
      if (err.code === 'auth/unauthorized-domain') {
        const hostname = window.location.hostname || 'this domain';
        setUnauthorizedDomain(hostname);
        setError(`Firebase Error: "${hostname}" is not an authorized domain in your Firebase project.`);
        return;
      }
      if (err.code?.includes('api-key-expired') || err.message?.includes('API key expired') || err.message?.includes('api-key-expired')) {
        setError('Firebase API Key Expired: In your Firebase Console > Project Settings, check your Web API Key or generate a renewed key.');
        return;
      }
      console.error('Google Sign-in Error:', err);
      setError(err.message || 'Google sign-in could not be completed.');
    } finally {
      clearTimeout(loadingWatchdog);
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const body =
        mode === 'login'
          ? { usernameOrEmail: username || email, password }
          : { username, email, password };

      const deviceId = getDeviceFingerprint();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
          'X-Device-Fingerprint': deviceId,
        },
        body: JSON.stringify(body),
      });

      const { ok, data } = await safeParseResponse(res);
      if (!ok) {
        // Helpful suggestion if user tried signing up with existing admin account
        if (mode === 'signup' && (data.error?.includes('already taken') || data.error?.includes('already registered'))) {
          if (username.toLowerCase() === 'shifin' || email.toLowerCase().includes('shifin')) {
            throw new Error('This is your Admin account! Please switch to the "Sign In" tab to log in.');
          }
        }
        throw new Error(data.error || 'Authentication failed');
      }

      // Save token and invoke success immediately for instant UI response
      localStorage.setItem('ninimo_token', data.token);
      try {
        localStorage.setItem('ninimo_user_profile', JSON.stringify(data.user));
      } catch {}
      onSuccess(data.user, data.token, data.quickToken);

      // Sync with Firebase Auth and Firestore in detached background task
      const targetEmail = email || (username.includes('@') ? username : data.user?.email);
      if (targetEmail && password && targetEmail.includes('@')) {
        (async () => {
          try {
            if (mode === 'signup') {
              const userCred = await createUserWithEmailAndPassword(auth, targetEmail, password);
              if (username) {
                await updateProfile(userCred.user, { displayName: username });
              }
              await syncUserToFirestore(userCred.user, username);
            } else {
              const userCred = await signInWithEmailAndPassword(auth, targetEmail, password);
              await syncUserToFirestore(userCred.user);
            }
          } catch (fbErr: any) {
            console.debug('Firebase background sync notice:', fbErr?.code || fbErr?.message);
          }
        })();
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto overscroll-contain">
      <motion.div
        id="auth-modal-card"
        initial={{ opacity: 0, scale: 0.75, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className={`border rounded-2xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative my-auto transition-colors will-change-transform transform-gpu ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-4 sm:p-6 pb-3 sm:pb-4 flex items-center justify-between relative border-b ${
          isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <NinimoIcon size="md" />
            <div>
              <h3 className={`font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                Ninimo
                <span className={`font-bold text-[9px] sm:text-[10px] border px-2 py-0.5 rounded-full font-mono uppercase tracking-wider ${
                  isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-200 text-zinc-800 border-zinc-300'
                }`}>
                  24/7 Platform
                </span>
              </h3>
              <p className={`text-[11px] sm:text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                High-Performance Minecraft Bot Fleet
              </p>
            </div>
          </div>

          {canDismiss && onClose && (
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
              }`}
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Tab switchers */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-5">
          <div className={`grid grid-cols-2 p-1 border rounded-xl relative ${
            isColourUI ? 'bg-[#070d1e] border-indigo-500/40' : isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
          }`}>
            <button
              type="button"
              id="modal-signup-tab"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`py-2 sm:py-2.5 text-xs font-bold rounded-lg transition-all duration-150 relative z-10 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                mode === 'signup'
                  ? isColourUI
                    ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white font-extrabold shadow-md shadow-cyan-500/25'
                    : 'bg-white text-zinc-950 font-extrabold shadow-sm'
                  : isColourUI
                  ? 'text-slate-300 hover:text-white'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${
                mode === 'signup'
                  ? isColourUI ? 'text-white' : 'text-zinc-950'
                  : isColourUI ? 'text-cyan-400' : 'text-zinc-400'
              }`} />
              <span>Sign Up</span>
              <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded ${
                mode === 'signup'
                  ? isColourUI
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-200 text-zinc-900 border border-zinc-300'
                  : isColourUI
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : isDark
                  ? 'bg-zinc-800 text-zinc-300'
                  : 'bg-zinc-100 text-zinc-600'
              }`}>
                FREE
              </span>
            </button>

            <button
              type="button"
              id="modal-login-tab"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 sm:py-2.5 text-xs font-bold rounded-lg transition-all duration-150 relative z-10 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                mode === 'login'
                  ? isColourUI
                    ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white font-extrabold shadow-md shadow-cyan-500/25'
                    : isDark
                    ? 'bg-zinc-800 text-white font-extrabold shadow-xs'
                    : 'bg-white text-zinc-950 font-extrabold shadow-xs'
                  : isColourUI
                  ? 'text-slate-300 hover:text-white'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Lock className={`w-3.5 h-3.5 ${
                mode === 'login'
                  ? 'text-white'
                  : isColourUI ? 'text-cyan-400' : 'text-zinc-400'
              }`} />
              <span>Sign In</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {error && (
            <div className="p-2.5 sm:p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2 font-medium animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <div className="min-w-0">
                <span>{error}</span>
              </div>
            </div>
          )}

          {unauthorizedDomain && (
            <div className={`p-3 rounded-xl border space-y-2 text-xs transition-all ${
              isColourUI
                ? 'bg-[#0e1d3e] border-amber-500/40 text-amber-200'
                : isDark
                ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Firebase Domain Authorization Needed</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                Google popup sign-in requires this domain (<span className="font-mono font-bold">{unauthorizedDomain}</span>) to be added under <b>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains</b>.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(unauthorizedDomain);
                    setCopiedDomain(true);
                    setTimeout(() => setCopiedDomain(false), 2000);
                  }}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                      : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                  }`}
                >
                  {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDomain ? 'Copied to Clipboard' : 'Copy Domain'}</span>
                </button>
                <a
                  href="https://console.firebase.google.com/project/ninimo-afk/authentication/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-[11px] bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Firebase Settings</span>
                </a>
              </div>
            </div>
          )}

          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            id="google-signin-btn"
            className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 border transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
              isColourUI
                ? 'bg-[#0c1a38] hover:bg-[#12244c] border-indigo-500/40 text-white'
                : isDark
                ? 'bg-zinc-950 hover:bg-zinc-800 border-zinc-700/80 text-white'
                : 'bg-white hover:bg-zinc-50 border-zinc-300 text-zinc-800'
            }`}
          >
            {isGoogleLoading ? (
              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className={`w-full border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`} />
            <span className={`absolute px-2.5 text-[10px] uppercase font-mono tracking-wider ${
              isDark ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-zinc-400'
            }`}>
              or with credentials
            </span>
          </div>

          {/* Quick Login for Previous Session */}
          {mode === 'login' && quickLoginUser && (
            <div className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all ${
              isColourUI
                ? 'bg-[#0c1a38] border-cyan-500/30 text-cyan-200'
                : isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-zinc-900/90 border-zinc-700/80 text-zinc-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isColourUI ? 'text-cyan-400' : isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Previous Login Detected</span>
                </div>
                {onForgetQuickLogin && (
                  <button
                    type="button"
                    onClick={onForgetQuickLogin}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                  >
                    Forget
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    isColourUI
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                      : isLight
                      ? 'bg-slate-900 text-white border border-slate-900'
                      : 'bg-white/10 text-white border border-white/20'
                  }`}>
                    {quickLoginUser.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${
                      isColourUI ? 'text-white' : isLight ? 'text-slate-950' : 'text-white'
                    }`}>
                      {quickLoginUser.username}
                    </p>
                    <p className={`text-[10px] truncate ${
                      isColourUI ? 'text-slate-300' : isLight ? 'text-slate-500' : 'text-zinc-400'
                    }`}>
                      {quickLoginUser.email}
                    </p>
                  </div>
                </div>

                {onQuickLogin && (
                  <button
                    type="button"
                    onClick={onQuickLogin}
                    disabled={isQuickLoggingIn}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-xs ${
                      isColourUI
                        ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black shadow-cyan-500/25'
                        : isLight
                        ? 'bg-slate-950 hover:bg-slate-800 text-white font-black shadow-slate-950/20'
                        : 'bg-white hover:bg-zinc-200 text-zinc-950 font-black shadow-white/10'
                    }`}
                  >
                    {isQuickLoggingIn ? (
                      <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3 fill-current" />
                    )}
                    <span>Quick In</span>
                  </button>
                )}
              </div>

              <div className={`flex items-center gap-2 pt-1 border-t text-[10px] ${
                isColourUI
                  ? 'border-cyan-500/20 text-slate-400'
                  : isLight
                  ? 'border-slate-200 text-slate-500'
                  : 'border-zinc-700/60 text-zinc-400'
              }`}>
                <span>Or sign in with password below:</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
            {/* Username / Email */}
            <div>
              <label className={`block text-xs font-semibold mb-1 flex items-center justify-between ${
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              }`}>
                <span>{mode === 'login' ? 'Username or Email' : 'Choose Username'}</span>
                <span className="text-[10px] text-zinc-500 font-mono font-normal">
                  {mode === 'signup' ? '3-16 characters' : ''}
                </span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={mode === 'login' ? 'player1 or player@example.com' : 'e.g. MinecraftPro99'}
                  required
                  className={`w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-zinc-500 transition-colors ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500'
                      : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>
            </div>

            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  initial={{ height: 0, opacity: 0, scale: 0.95 }}
                  animate={{ height: 'auto', opacity: 1, scale: 1 }}
                  exit={{ height: 0, opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pb-1">
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        required={mode === 'signup'}
                        className={`w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-zinc-500 transition-colors ${
                          isDark
                            ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500'
                            : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                        }`}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Password
                </label>
                {mode === 'signup' && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Min 6 characters
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`w-full border rounded-xl pl-10 pr-10 py-2.5 text-xs focus:outline-none focus:border-zinc-500 transition-colors ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500'
                      : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className={`w-full py-2.5 sm:py-3 font-extrabold rounded-xl text-xs tracking-wide flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer mt-1 sm:mt-2 border ${
                isColourUI
                  ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-white border-cyan-400/40 shadow-lg shadow-cyan-500/25'
                  : isDark
                  ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-white shadow-zinc-950/40'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900 shadow-zinc-900/20'
              }`}
            >
              {isLoading ? (
                <span className={`inline-block w-4 h-4 border-2 rounded-full animate-spin ${
                  isColourUI
                    ? 'border-white/30 border-t-white'
                    : isDark
                    ? 'border-zinc-900/30 border-t-zinc-900'
                    : 'border-white/30 border-t-white'
                }`} />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Ninimo' : 'Complete Registration'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>

            {/* Guarantee banner */}
            <div className="pt-1 text-center">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-500">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Protected by Firebase Authentication & 24/7 Bot Workers.</span>
              </span>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
