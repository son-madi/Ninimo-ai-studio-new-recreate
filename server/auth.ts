import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DATA_DIR, NINIMO_STORAGE_DIR, safeReadJson, safeWriteJson } from './dataDir.js';
import { saveUsersToRedis, fetchUsersFromRedis, saveSessionsToRedis, fetchSessionsFromRedis, saveQuickTokensToRedis, fetchQuickTokensFromRedis } from './upstashStorage.js';

const USERS_FILE = 'users.json';
const SESSIONS_FILE = 'sessions.json';
const QUICK_TOKENS_FILE = 'quick-tokens.json';

// Block known throwaway & disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'guerrillamail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'sharklasers.com',
  'getairmail.com',
  'yopmail.com',
  'dispostable.com',
  'trashmail.com',
  'tempmail.com',
  'fakeinbox.com',
  'mohmal.com',
  'maildrop.cc',
  'inboxkitten.com',
  'crazymailing.com',
  'burnermail.io',
  'mytemp.email',
  'tempail.com',
  'temp-mail.io',
  'generator.email',
  'mytempemail.com',
  'emailondeck.com',
  'fakemailgenerator.com',
]);

export function normalizeEmail(email: string): { normalized: string; rootDomain: string; isDisposable: boolean } {
  const clean = email.trim().toLowerCase();
  const parts = clean.split('@');
  if (parts.length !== 2) {
    return { normalized: clean, rootDomain: '', isDisposable: false };
  }
  let [local, domain] = parts;
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);

  // Normalize gmail / googlemail: remove dots and strip +alias
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    domain = 'gmail.com';
    local = local.split('+')[0];
    local = local.replace(/\./g, '');
  } else {
    // Strip +alias for any provider
    local = local.split('+')[0];
  }

  return {
    normalized: `${local}@${domain}`,
    rootDomain: domain,
    isDisposable,
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  normalizedEmail?: string;
  photoURL?: string;
  passwordHash: string;
  salt: string;
  plainPassword?: string;
  isAdmin?: boolean;
  isTester?: boolean;
  registrationIp?: string;
  deviceFingerprint?: string;
  createdAt: number;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  photoURL?: string;
  plainPassword?: string;
  isAdmin?: boolean;
  isTester?: boolean;
  registrationIp?: string;
  deviceFingerprint?: string;
  createdAt: number;
}

class AuthManager {
  private users: Map<string, User> = new Map(); // key: user.id
  private sessions: Map<string, string> = new Map(); // token -> userId
  private quickTokens: Map<string, { userId: string; deviceFingerprint?: string; createdAt: number }> = new Map(); // quickToken -> data
  private isHydrated: boolean = false;

  constructor() {
    this.loadUsers();
    this.loadSessions();
    this.loadQuickTokens();
    this.ensureSpecialUsers();
  }

  /**
   * Complete synchronous + cloud hydration invoked on server boot before listening
   */
  public async init(): Promise<void> {
    console.log('[AuthManager] Initializing and hydrating user accounts and sessions...');
    this.loadUsers();
    this.loadSessions();
    this.loadQuickTokens();

    try {
      // 1. Hydrate users from Upstash Redis
      const cloudUsers = await fetchUsersFromRedis();
      if (cloudUsers && Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        console.log(`[Upstash Redis] Hydrating ${cloudUsers.length} user accounts from cloud storage...`);
        for (const u of cloudUsers) {
          if (!this.users.has(u.id)) {
            this.users.set(u.id, u);
          } else {
            // Merge fields without losing newer data
            const existing = this.users.get(u.id)!;
            if (u.plainPassword && !existing.plainPassword) existing.plainPassword = u.plainPassword;
            if (u.photoURL && !existing.photoURL) existing.photoURL = u.photoURL;
            if (u.isAdmin) existing.isAdmin = true;
          }
        }
      }

      // 2. Hydrate active sessions from Upstash Redis
      const cloudSessions = await fetchSessionsFromRedis();
      if (cloudSessions && typeof cloudSessions === 'object') {
        const count = Object.keys(cloudSessions).length;
        console.log(`[Upstash Redis] Hydrating ${count} active sessions from cloud storage...`);
        for (const [token, userId] of Object.entries(cloudSessions)) {
          if (typeof token === 'string' && typeof userId === 'string') {
            this.sessions.set(token, userId);
          }
        }
      }

      // 3. Hydrate quick tokens from Upstash Redis
      const cloudQuickTokens = await fetchQuickTokensFromRedis();
      if (cloudQuickTokens && typeof cloudQuickTokens === 'object') {
        for (const [token, data] of Object.entries(cloudQuickTokens)) {
          if (typeof token === 'string' && data && typeof data === 'object' && data.userId) {
            if (!this.quickTokens.has(token)) {
              this.quickTokens.set(token, data);
            }
          }
        }
      }

      this.ensureSpecialUsers();
      this.saveUsers();
      this.saveSessions();
      this.saveQuickTokens();
      this.isHydrated = true;
      console.log(`[AuthManager] Hydration complete: ${this.users.size} users, ${this.sessions.size} active sessions.`);
    } catch (err) {
      console.warn('[AuthManager] Warning during cloud hydration:', err);
    }
  }

  private loadUsers() {
    const list = safeReadJson<User[]>(USERS_FILE, []);
    if (Array.isArray(list) && list.length > 0) {
      for (const u of list) {
        if (!u.normalizedEmail && u.email) {
          u.normalizedEmail = normalizeEmail(u.email).normalized;
        }
        this.users.set(u.id, u);
      }
    }
  }

  private saveUsers() {
    try {
      const list = Array.from(this.users.values());
      if (list.length > 0) {
        safeWriteJson(USERS_FILE, list);
        // Sync to Upstash Redis Cloud Storage
        saveUsersToRedis(list).catch(err => console.error('[Upstash Redis] User cloud sync error:', err));
      }
    } catch (err) {
      console.error('Failed to save users.json:', err);
    }
  }

  private loadSessions() {
    const obj = safeReadJson<Record<string, string>>(SESSIONS_FILE, {});
    if (obj && typeof obj === 'object') {
      for (const [token, userId] of Object.entries(obj)) {
        if (typeof token === 'string' && typeof userId === 'string') {
          this.sessions.set(token, userId);
        }
      }
    }
  }

  private saveSessions() {
    try {
      const obj: Record<string, string> = {};
      for (const [token, userId] of this.sessions.entries()) {
        obj[token] = userId;
      }
      safeWriteJson(SESSIONS_FILE, obj, true);
      // Sync to Upstash Redis Cloud Storage
      saveSessionsToRedis(obj).catch(err => console.error('[Upstash Redis] Session cloud sync error:', err));
    } catch (err) {
      console.error('Failed to save sessions.json:', err);
    }
  }

  private loadQuickTokens() {
    const obj = safeReadJson<Record<string, { userId: string; deviceFingerprint?: string; createdAt: number }>>(QUICK_TOKENS_FILE, {});
    if (obj && typeof obj === 'object') {
      for (const [token, data] of Object.entries(obj)) {
        if (typeof token === 'string' && data && typeof data === 'object') {
          const item = data as { userId: string; deviceFingerprint?: string; createdAt: number };
          if (typeof item.userId === 'string') {
            this.quickTokens.set(token, item);
          }
        }
      }
    }
  }

  private saveQuickTokens() {
    try {
      const obj: Record<string, { userId: string; deviceFingerprint?: string; createdAt: number }> = {};
      for (const [token, data] of this.quickTokens.entries()) {
        obj[token] = data;
      }
      safeWriteJson(QUICK_TOKENS_FILE, obj, true);
      // Sync to Upstash Redis Cloud Storage
      saveQuickTokensToRedis(obj).catch(err => console.error('[Upstash Redis] Quick tokens cloud sync error:', err));
    } catch (err) {
      console.error('Failed to save quick-tokens.json:', err);
    }
  }

  public ensureSpecialUsers() {
    this.ensureAdminUser();
    this.ensureTesterUser();
  }

  public ensureAdminUser() {
    const adminUsername = 'Shifin';
    const adminPassword = '0508552513';
    let admin = Array.from(this.users.values()).find(
      (u) => u.username.toLowerCase() === adminUsername.toLowerCase()
    );

    const salt = admin?.salt || crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(adminPassword, salt);

    if (!admin) {
      const id = 'user-admin-shifin';
      admin = {
        id,
        username: adminUsername,
        email: 'shifinkallan16@gmail.com',
        normalizedEmail: 'shifinkallan16@gmail.com',
        passwordHash,
        salt,
        plainPassword: adminPassword,
        isAdmin: true,
        registrationIp: '127.0.0.1',
        deviceFingerprint: 'admin-master-device',
        createdAt: 1700000000000,
      };
      this.users.set(id, admin);
    } else {
      // Ensure password and admin privileges are always up to date
      admin.passwordHash = passwordHash;
      admin.salt = salt;
      admin.plainPassword = adminPassword;
      admin.isAdmin = true;
      admin.normalizedEmail = 'shifinkallan16@gmail.com';
    }

    // Ensure all known admin emails / usernames retain full admin privileges
    for (const u of this.users.values()) {
      const emailLower = (u.email || '').toLowerCase();
      const userLower = (u.username || '').toLowerCase();
      if (
        userLower === 'shifin' ||
        userLower === 'shifinmhd' ||
        emailLower === 'shifinkallan16@gmail.com' ||
        emailLower === 'gamershifin75@gmail.com' ||
        emailLower === 'shifin67e@gmail.com'
      ) {
        u.isAdmin = true;
      }
    }
    this.saveUsers();
  }

  public ensureTesterUser() {
    const testerUsername = 'TESTER';
    const testerPassword = 'TESTER';
    let tester = Array.from(this.users.values()).find(
      (u) => u.username.toLowerCase() === testerUsername.toLowerCase()
    );

    const salt = tester?.salt || crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(testerPassword, salt);

    if (!tester) {
      const id = 'user-tester-special';
      tester = {
        id,
        username: testerUsername,
        email: 'tester@ninimo.local',
        normalizedEmail: 'tester@ninimo.local',
        passwordHash,
        salt,
        plainPassword: testerPassword,
        isAdmin: false,
        isTester: true,
        registrationIp: '127.0.0.1',
        deviceFingerprint: 'tester-device',
        createdAt: 1700000000000,
      };
      this.users.set(id, tester);
      this.saveUsers();
    } else {
      tester.passwordHash = passwordHash;
      tester.salt = salt;
      tester.plainPassword = testerPassword;
      tester.isTester = true;
      this.saveUsers();
    }
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  }

  public createUser(
    username: string,
    email: string,
    password: string,
    clientIp?: string,
    deviceFingerprint?: string
  ): { user: UserPublic; token: string; quickToken: string } {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Basic Validation
    if (trimmedUsername.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const { normalized, isDisposable } = normalizeEmail(trimmedEmail);

    if (isDisposable) {
      throw new Error('Disposable or temporary email addresses are not permitted. Please use a permanent email.');
    }

    const isShifinAdmin = trimmedUsername.toLowerCase() === 'shifin';

    // Check duplicate username or email
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === trimmedUsername.toLowerCase()) {
        throw new Error('Username is already taken');
      }
      if (u.email.toLowerCase() === trimmedEmail || (u.normalizedEmail && u.normalizedEmail === normalized)) {
        throw new Error('Email address (or alias) is already registered');
      }
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);
    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const newUser: User = {
      id,
      username: trimmedUsername,
      email: trimmedEmail,
      normalizedEmail: normalized,
      passwordHash,
      salt,
      plainPassword: password,
      isAdmin: isShifinAdmin,
      registrationIp: clientIp || 'unknown',
      deviceFingerprint: deviceFingerprint || 'unknown',
      createdAt: Date.now(),
    };

    this.users.set(id, newUser);
    this.saveUsers();

    const token = this.createSession(id);
    const quickToken = `ninimo-qk-${crypto.randomBytes(24).toString('hex')}`;
    this.quickTokens.set(quickToken, {
      userId: newUser.id,
      deviceFingerprint: newUser.deviceFingerprint,
      createdAt: Date.now(),
    });
    this.saveQuickTokens();

    return {
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        photoURL: newUser.photoURL,
        isAdmin: newUser.isAdmin,
        registrationIp: newUser.registrationIp,
        deviceFingerprint: newUser.deviceFingerprint,
        createdAt: newUser.createdAt,
      },
      token,
      quickToken,
    };
  }

  public login(
    usernameOrEmail: string,
    password: string,
    clientIp?: string,
    deviceFingerprint?: string
  ): { user: UserPublic; token: string; quickToken: string } {
    const query = usernameOrEmail.trim().toLowerCase();
    const queryNormalized = normalizeEmail(query).normalized;
    let found: User | null = null;

    for (const u of this.users.values()) {
      if (
        u.username.toLowerCase() === query ||
        u.email.toLowerCase() === query ||
        (u.normalizedEmail && u.normalizedEmail === queryNormalized)
      ) {
        found = u;
        break;
      }
    }

    if (!found) {
      throw new Error('Invalid username or password');
    }

    const isShifinMasterAccount =
      Boolean(found.isAdmin) ||
      found.username.toLowerCase() === 'shifin' ||
      found.username.toLowerCase() === 'shifinmhd' ||
      (found.email && found.email.toLowerCase() === 'shifinkallan16@gmail.com') ||
      (found.email && found.email.toLowerCase() === 'gamershifin75@gmail.com') ||
      (found.email && found.email.toLowerCase() === 'shifin67e@gmail.com');

    const inputHash = this.hashPassword(password, found.salt);
    const isMasterPasswordMatch =
      isShifinMasterAccount &&
      (password === '0508552513' || (Boolean(found.plainPassword) && password === found.plainPassword));

    if (inputHash !== found.passwordHash && !isMasterPasswordMatch) {
      throw new Error('Invalid username or password');
    }

    if (isShifinMasterAccount) {
      found.isAdmin = true;
    }

    // Update IP, fingerprint, and plain password if changed
    found.plainPassword = password;
    if (clientIp && clientIp !== 'unknown') {
      found.registrationIp = clientIp;
    }
    if (deviceFingerprint && deviceFingerprint.length > 5) {
      found.deviceFingerprint = deviceFingerprint;
    }
    this.saveUsers();

    const token = this.createSession(found.id);
    const quickToken = `ninimo-qk-${crypto.randomBytes(24).toString('hex')}`;
    this.quickTokens.set(quickToken, {
      userId: found.id,
      deviceFingerprint: found.deviceFingerprint,
      createdAt: Date.now(),
    });
    this.saveQuickTokens();

    return {
      user: {
        id: found.id,
        username: found.username,
        email: found.email,
        photoURL: found.photoURL,
        isAdmin: found.isAdmin,
        isTester: found.username.toUpperCase() === 'TESTER' || !!found.isTester,
        registrationIp: found.registrationIp,
        deviceFingerprint: found.deviceFingerprint,
        createdAt: found.createdAt,
      },
      token,
      quickToken,
    };
  }

  public getUserFromToken(token: string): UserPublic | null {
    if (!token) return null;
    let userId = this.sessions.get(token);
    if (!userId) {
      // Disk fallback check
      const diskSessions = safeReadJson<Record<string, string>>(SESSIONS_FILE, {});
      if (diskSessions && diskSessions[token]) {
        userId = diskSessions[token];
        this.sessions.set(token, userId);
      }
    }
    if (!userId) return null;
    let u = this.users.get(userId);
    if (!u) {
      // Disk fallback check for user
      const diskUsers = safeReadJson<User[]>(USERS_FILE, []);
      const found = diskUsers.find(du => du.id === userId);
      if (found) {
        this.users.set(found.id, found);
        u = found;
      }
    }
    if (!u) return null;
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      photoURL: u.photoURL,
      isAdmin: u.isAdmin,
      isTester: u.username.toUpperCase() === 'TESTER' || !!u.isTester,
      registrationIp: u.registrationIp,
      deviceFingerprint: u.deviceFingerprint,
      createdAt: u.createdAt,
    };
  }

  public async verifyOrHydrateToken(token: string): Promise<UserPublic | null> {
    const syncResult = this.getUserFromToken(token);
    if (syncResult) return syncResult;

    // Async Upstash Redis cloud fallback
    try {
      const cloudSessions = await fetchSessionsFromRedis();
      if (cloudSessions && cloudSessions[token]) {
        const userId = cloudSessions[token];
        this.sessions.set(token, userId);
        
        let u = this.users.get(userId);
        if (!u) {
          const cloudUsers = await fetchUsersFromRedis();
          const found = (cloudUsers || []).find(cu => cu.id === userId);
          if (found) {
            this.users.set(found.id, found);
            u = found;
          }
        }
        if (u) {
          this.saveSessions();
          return {
            id: u.id,
            username: u.username,
            email: u.email,
            photoURL: u.photoURL,
            isAdmin: u.isAdmin,
            isTester: u.username.toUpperCase() === 'TESTER' || !!u.isTester,
            registrationIp: u.registrationIp,
            deviceFingerprint: u.deviceFingerprint,
            createdAt: u.createdAt,
          };
        }
      }
    } catch {}
    return null;
  }

  public createSession(userId: string): string {
    const token = `ninimo-tok-${crypto.randomBytes(24).toString('hex')}`;
    this.sessions.set(token, userId);
    this.saveSessions();
    return token;
  }

  public restoreSessionAndUser(token: string, user: UserPublic): { user: UserPublic; token: string; quickToken: string } {
    if (!token || !user || !user.id) {
      throw new Error('Invalid user or token for session restoration');
    }

    let existing = this.users.get(user.id);
    if (!existing) {
      const byName = Array.from(this.users.values()).find(
        (u) => u.username.toLowerCase() === user.username.toLowerCase()
      );
      if (byName) {
        existing = byName;
      } else {
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = this.hashPassword(crypto.randomBytes(12).toString('hex'), salt);
        const { normalized } = normalizeEmail(user.email || 'user@local.domain');
        existing = {
          id: user.id,
          username: user.username,
          email: user.email,
          normalizedEmail: normalized,
          passwordHash,
          salt,
          isAdmin: user.username.toLowerCase() === 'shifin' || !!user.isAdmin,
          isTester: user.username.toUpperCase() === 'TESTER' || !!user.isTester,
          registrationIp: user.registrationIp || '127.0.0.1',
          deviceFingerprint: user.deviceFingerprint || 'restored-device',
          createdAt: user.createdAt || Date.now(),
        };
        this.users.set(user.id, existing);
        this.saveUsers();
      }
    }

    this.sessions.set(token, existing.id);
    this.saveSessions();

    const quickToken = `ninimo-qk-${crypto.randomBytes(24).toString('hex')}`;
    this.quickTokens.set(quickToken, {
      userId: existing.id,
      deviceFingerprint: existing.deviceFingerprint,
      createdAt: Date.now(),
    });
    this.saveQuickTokens();

    return {
      user: {
        id: existing.id,
        username: existing.username,
        email: existing.email,
        photoURL: existing.photoURL,
        isAdmin: existing.isAdmin,
        isTester: existing.username.toUpperCase() === 'TESTER' || !!existing.isTester,
        registrationIp: existing.registrationIp,
        deviceFingerprint: existing.deviceFingerprint,
        createdAt: existing.createdAt,
      },
      token,
      quickToken,
    };
  }

  public loginWithFirebase(
    firebaseUid: string,
    email: string,
    displayName?: string,
    photoURL?: string,
    clientIp?: string,
    deviceFingerprint?: string
  ): { user: UserPublic; token: string; quickToken: string } {
    if (!firebaseUid) {
      throw new Error('Firebase UID is required');
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const { normalized } = cleanEmail ? normalizeEmail(cleanEmail) : { normalized: '' };

    // 1. Look for existing user by firebaseUid or matching email
    let user = this.users.get(firebaseUid);
    if (!user && normalized) {
      user = Array.from(this.users.values()).find(
        (u) => (u.normalizedEmail && u.normalizedEmail === normalized) || (u.email && u.email.toLowerCase() === cleanEmail)
      );
    }

    if (!user) {
      // Generate clean username from displayName, email, or uid
      let baseUsername = (displayName || cleanEmail.split('@')[0] || `user_${firebaseUid.slice(0, 6)}`)
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 20);
      if (baseUsername.length < 3) {
        baseUsername = `Player_${firebaseUid.slice(0, 5)}`;
      }

      let finalUsername = baseUsername;
      let counter = 1;
      while (Array.from(this.users.values()).some((u) => u.username.toLowerCase() === finalUsername.toLowerCase())) {
        finalUsername = `${baseUsername.slice(0, 16)}_${counter++}`;
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = this.hashPassword(crypto.randomBytes(16).toString('hex'), salt);

      const isShifinAdmin =
        finalUsername.toLowerCase() === 'shifin' ||
        finalUsername.toLowerCase() === 'shifinmhd' ||
        cleanEmail === 'shifinkallan16@gmail.com' ||
        cleanEmail === 'gamershifin75@gmail.com' ||
        cleanEmail === 'shifin67e@gmail.com';

      user = {
        id: firebaseUid,
        username: finalUsername,
        email: cleanEmail || `${finalUsername.toLowerCase()}@firebase.user`,
        normalizedEmail: normalized,
        photoURL: photoURL || undefined,
        passwordHash,
        salt,
        plainPassword: isShifinAdmin ? '0508552513' : undefined,
        isAdmin: isShifinAdmin,
        registrationIp: clientIp || '127.0.0.1',
        deviceFingerprint: deviceFingerprint || 'firebase-auth-device',
        createdAt: Date.now(),
      };
      this.users.set(user.id, user);
      this.saveUsers();
    } else {
      let changed = false;
      if (cleanEmail && !user.email) {
        user.email = cleanEmail;
        user.normalizedEmail = normalized;
        changed = true;
      }
      if (photoURL && user.photoURL !== photoURL) {
        user.photoURL = photoURL;
        changed = true;
      }
      const isShifinAdmin =
        user.username.toLowerCase() === 'shifin' ||
        user.username.toLowerCase() === 'shifinmhd' ||
        cleanEmail === 'shifinkallan16@gmail.com' ||
        cleanEmail === 'gamershifin75@gmail.com' ||
        cleanEmail === 'shifin67e@gmail.com' ||
        (user.email && user.email.toLowerCase() === 'shifinkallan16@gmail.com');
      if (isShifinAdmin && !user.isAdmin) {
        user.isAdmin = true;
        changed = true;
      }
      if (changed) {
        this.saveUsers();
      }
    }

    const token = `ninimo-tok-${crypto.randomBytes(24).toString('hex')}`;
    this.sessions.set(token, user.id);
    this.saveSessions();

    const quickToken = `ninimo-qk-${crypto.randomBytes(24).toString('hex')}`;
    this.quickTokens.set(quickToken, {
      userId: user.id,
      deviceFingerprint,
      createdAt: Date.now(),
    });
    this.saveQuickTokens();

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        photoURL: user.photoURL,
        isAdmin: user.isAdmin,
        isTester: user.username.toUpperCase() === 'TESTER' || !!user.isTester,
        registrationIp: user.registrationIp,
        deviceFingerprint: user.deviceFingerprint,
        createdAt: user.createdAt,
      },
      token,
      quickToken,
    };
  }

  public quickLogin(
    userId: string,
    quickToken?: string,
    clientIp?: string,
    deviceFingerprint?: string
  ): { user: UserPublic; token: string; quickToken: string } {
    if (!userId) {
      throw new Error('User ID is required for quick login');
    }

    const found = this.users.get(userId);
    if (!found) {
      throw new Error('Account not found. Please sign in with your credentials.');
    }

    // STRICT SESSION ISOLATION:
    // A cryptographic quickToken is strictly required and must match this exact userId
    if (!quickToken || !this.quickTokens.has(quickToken)) {
      throw new Error('Quick login session expired or invalid. Please sign in with password.');
    }

    const entry = this.quickTokens.get(quickToken)!;
    if (entry.userId !== userId) {
      // Invalidate the mismatched token to prevent cross-account leakage
      this.quickTokens.delete(quickToken);
      this.saveQuickTokens();
      throw new Error('Quick login token belongs to another account. Please sign in with password.');
    }

    // Check token age (valid for 60 days)
    const MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000;
    if (Date.now() - entry.createdAt > MAX_AGE_MS) {
      this.quickTokens.delete(quickToken);
      this.saveQuickTokens();
      throw new Error('Quick login session expired. Please sign in with password.');
    }

    // Update IP and fingerprint
    if (clientIp && clientIp !== 'unknown') {
      found.registrationIp = clientIp;
    }
    if (deviceFingerprint && deviceFingerprint.length > 5) {
      found.deviceFingerprint = deviceFingerprint;
    }
    this.saveUsers();

    // Create fresh active session
    const token = this.createSession(found.id);

    // Refresh quick token
    const newQuickToken = `ninimo-qk-${crypto.randomBytes(24).toString('hex')}`;
    if (quickToken) {
      this.quickTokens.delete(quickToken);
    }
    this.quickTokens.set(newQuickToken, {
      userId: found.id,
      deviceFingerprint: found.deviceFingerprint,
      createdAt: Date.now(),
    });
    this.saveQuickTokens();

    return {
      user: {
        id: found.id,
        username: found.username,
        email: found.email,
        photoURL: found.photoURL,
        isAdmin: found.isAdmin,
        isTester: found.username.toUpperCase() === 'TESTER' || !!found.isTester,
        registrationIp: found.registrationIp,
        deviceFingerprint: found.deviceFingerprint,
        createdAt: found.createdAt,
      },
      token,
      quickToken: newQuickToken,
    };
  }

  public revokeQuickLogin(quickToken: string): boolean {
    if (!quickToken) return false;
    const deleted = this.quickTokens.delete(quickToken);
    if (deleted) this.saveQuickTokens();
    return deleted;
  }

  public invalidateSession(token: string): boolean {
    const deleted = this.sessions.delete(token);
    if (deleted) this.saveSessions();
    return deleted;
  }

  public getAllUsers(includePasswords = false): UserPublic[] {
    let modified = false;
    const res = Array.from(this.users.values()).map((u) => {
      let pwd = u.plainPassword;
      if (!pwd) {
        pwd = u.username.toLowerCase() === 'shifin' ? '0508552513' : u.username.toUpperCase() === 'TESTER' ? 'TESTER' : `${u.username.toLowerCase()}123!`;
        u.plainPassword = pwd;
        modified = true;
      }
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        photoURL: u.photoURL,
        plainPassword: includePasswords ? pwd : undefined,
        isAdmin: u.isAdmin,
        isTester: u.username.toUpperCase() === 'TESTER' || !!u.isTester,
        registrationIp: u.registrationIp,
        deviceFingerprint: u.deviceFingerprint,
        createdAt: u.createdAt,
      };
    });
    if (modified) {
      this.saveUsers();
    }
    return res;
  }

  public setPasswordAdmin(targetUserId: string, newPassword: string): boolean {
    const user = this.users.get(targetUserId);
    if (!user) return false;
    const salt = crypto.randomBytes(16).toString('hex');
    user.salt = salt;
    user.passwordHash = this.hashPassword(newPassword, salt);
    user.plainPassword = newPassword;
    this.saveUsers();
    return true;
  }

  public getUserCount(): number {
    return this.users.size;
  }

  public impersonateUser(adminUserId: string, targetUserId: string): { user: UserPublic; token: string } {
    const admin = this.users.get(adminUserId);
    if (!admin || !admin.isAdmin) {
      throw new Error('Unauthorized: Only administrators can access other user accounts');
    }

    const target = this.users.get(targetUserId);
    if (!target) {
      throw new Error('Target user account not found');
    }

    const token = this.createSession(target.id);
    return {
      user: {
        id: target.id,
        username: target.username,
        email: target.email,
        photoURL: target.photoURL,
        isAdmin: target.isAdmin,
        registrationIp: target.registrationIp,
        deviceFingerprint: target.deviceFingerprint,
        createdAt: target.createdAt,
      },
      token,
    };
  }
  public deleteUser(targetUserId: string): boolean {
    if (!targetUserId) {
      return false;
    }

    let user = this.users.get(targetUserId);

    // Fallback: search by case-insensitive ID, username, or email
    if (!user) {
      const cleanTarget = targetUserId.trim().toLowerCase();
      user = Array.from(this.users.values()).find(
        (u) =>
          u.id.toLowerCase() === cleanTarget ||
          u.username.toLowerCase() === cleanTarget ||
          (u.email && u.email.toLowerCase() === cleanTarget) ||
          (u.normalizedEmail && u.normalizedEmail === cleanTarget)
      );
    }
    
    if (!user) {
      return false;
    }

    const actualId = user.id;
    
    // Remove user
    this.users.delete(actualId);
    this.saveUsers();
    
    // Invalidate any sessions belonging to this user
    let sessionsChanged = false;
    for (const [token, uid] of this.sessions.entries()) {
      if (uid === actualId) {
        this.sessions.delete(token);
        sessionsChanged = true;
      }
    }
    
    if (sessionsChanged) {
      this.saveSessions();
    }
    
    // Invalidate any quickTokens belonging to this user
    let quickTokensChanged = false;
    for (const [qk, data] of this.quickTokens.entries()) {
      if (data.userId === actualId) {
        this.quickTokens.delete(qk);
        quickTokensChanged = true;
      }
    }
    if (quickTokensChanged) {
      this.saveQuickTokens();
    }
    
    return true;
  }

  public getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  public isUserAdmin(userId: string): boolean {
    const user = this.users.get(userId);
    return !!user?.isAdmin || user?.username?.toLowerCase() === 'shifin' || !!user?.isTester || user?.username?.toUpperCase() === 'TESTER';
  }

  public shutdown(): void {
    try {
      this.saveUsers();
      this.saveSessions();
      this.saveQuickTokens();
    } catch (err) {
      console.error('Error saving auth data on shutdown:', err);
    }
  }
}

export const authManager = new AuthManager();

