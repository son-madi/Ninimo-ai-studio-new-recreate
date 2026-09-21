import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { BotConfig, BotState, GlobalStats, PublicPlatformStats } from '../src/types.js';
import { BotInstance } from './botInstance.js';
import { authManager } from './auth.js';
import { DATA_DIR, NINIMO_STORAGE_DIR, safeReadJson, safeWriteJson } from './dataDir.js';
import { saveUserBotsToRedis, fetchUserBotsFromRedis, fetchUsersFromRedis, fetchAllBotsFromRedis } from './upstashStorage.js';

const CONFIG_FILE = 'bot-configs.json';
const SETTINGS_FILE = 'system-settings.json';
const USER_DEFAULTS_FILE = 'user-defaults.json';

export interface SystemSettings {
  globalBotLimit: number;
}

export class BotManager extends EventEmitter {
  private bots: Map<string, BotInstance> = new Map(); // botId -> BotInstance
  private hydratedUsers: Set<string> = new Set(); // users whose bots have been loaded from cloud/disk
  private sseClients: Map<string, Set<(data: any) => void>> = new Map(); // userId -> Set of callbacks
  private publicSseClients: Set<(data: any) => void> = new Set();
  private systemSettings: SystemSettings = { globalBotLimit: 1 };
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;

  constructor() {
    super();
    this.loadSettings();
    this.loadSavedConfigs();
    this.startHealthCheckLoop();
  }

  /**
   * Complete initialization invoked on server boot before listening
   */
  public async init(): Promise<void> {
    console.log('[BotManager] Initializing and hydrating bot configurations...');
    this.loadSettings();
    this.loadSavedConfigs();

    try {
      // 1. Check all users from Redis and fetch their bots
      const cloudUsers = await fetchUsersFromRedis();
      if (cloudUsers && Array.isArray(cloudUsers)) {
        for (const u of cloudUsers) {
          try {
            const uBots = await fetchUserBotsFromRedis(u.id);
            if (uBots && Array.isArray(uBots) && uBots.length > 0) {
              for (const conf of uBots) {
                if (!conf || !conf.id) continue;
                const existing = this.bots.get(conf.id);
                if (!existing) {
                  this.registerBot(conf);
                } else {
                  // Merge config
                  existing.updateConfig(conf);
                }
              }
            }
          } catch (e) {
            console.warn(`[BotManager] Error hydrating bots for user ${u.id}:`, e);
          }
        }
      }

      // 2. Also run general fetchAllBotsFromRedis in case of non-indexed users
      const allCloudBots = await fetchAllBotsFromRedis();
      if (allCloudBots && Array.isArray(allCloudBots) && allCloudBots.length > 0) {
        for (const conf of allCloudBots) {
          if (!conf || !conf.id) continue;
          const existing = this.bots.get(conf.id);
          if (!existing) {
            this.registerBot(conf);
          }
        }
      }

      // Save merged configs
      this.saveConfigs();
      this.isInitialized = true;
      console.log(`[BotManager] Initialization complete: ${this.bots.size} bots loaded across all users.`);

      // Start auto-resuming previously active bots
      this.startAutoResumeBots();
    } catch (err) {
      console.warn('[BotManager] Warning during cloud bot hydration:', err);
    }
  }

  public startAutoResumeBots(): void {
    let staggerDelayMs = 0;
    for (const bot of this.bots.values()) {
      const isPlaceholderHypixel = (bot.config.host || '').toLowerCase().includes('hypixel') && bot.config.auth === 'offline';
      const isDefaultNinimo = bot.config.name === 'NinimoBot' && (bot.config.host || '').toLowerCase().includes('hypixel');
      if (isPlaceholderHypixel || isDefaultNinimo) {
        bot.config.shouldRun = false;
        continue;
      }
      const shouldAutoConnect = bot.config.shouldRun === true;
      if (shouldAutoConnect && bot.status === 'stopped' && !bot.config.isSwarmBot) {
        const currentBot = bot;
        setTimeout(() => {
          console.log(`[AUTO-RESUME] Resuming bot "${currentBot.config.name}" (${currentBot.config.host}) for user ${currentBot.config.userId}...`);
          currentBot.start();
        }, staggerDelayMs);
        staggerDelayMs += 600;
      }
    }
  }

  private startHealthCheckLoop() {
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    // Keep server warm and verify 24/7 bots are healthy
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, 25000);
  }

  private performHealthCheck() {
    try {
      for (const bot of this.bots.values()) {
        const isPlaceholderHypixel = (bot.config.host || '').toLowerCase().includes('hypixel') && bot.config.auth === 'offline';
        const isDefaultNinimo = bot.config.name === 'NinimoBot' && (bot.config.host || '').toLowerCase().includes('hypixel');
        if (isPlaceholderHypixel || isDefaultNinimo) {
          bot.config.shouldRun = false;
          continue;
        }
        if (bot.config.shouldRun && (bot.status === 'stopped' || bot.status === 'error')) {
          console.log(`[AUTO-HEALING] Bot "${bot.config.name}" was marked active but was stopped. Re-initiating connection...`);
          bot.start();
        }
      }
    } catch (err) {
      console.error('[HEALTH-CHECK ERROR]:', err);
    }
  }

  private loadSettings() {
    const data = safeReadJson<any>(SETTINGS_FILE, {});
    if (data && typeof data.globalBotLimit === 'number' && data.globalBotLimit >= 1) {
      this.systemSettings.globalBotLimit = data.globalBotLimit;
    }
  }

  private saveSettings() {
    try {
      safeWriteJson(SETTINGS_FILE, this.systemSettings);
    } catch (err) {
      console.error('Failed to save system-settings.json:', err);
    }
  }

  public getGlobalBotLimit(): number {
    return this.systemSettings.globalBotLimit || 1;
  }

  public setGlobalBotLimit(limit: number): number {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    this.systemSettings.globalBotLimit = safeLimit;
    this.saveSettings();

    // Enforce active bot limits across all non-admin users and broadcast
    const botsByUser = new Map<string, BotInstance[]>();
    for (const bot of this.bots.values()) {
      if (!bot.config.userId) continue;
      // Admin bots are completely exempt from global limit restrictions
      if (authManager.isUserAdmin(bot.config.userId)) continue;

      if (!botsByUser.has(bot.config.userId)) {
        botsByUser.set(bot.config.userId, []);
      }
      botsByUser.get(bot.config.userId)!.push(bot);
    }

    for (const [userId, userBots] of botsByUser.entries()) {
      const activeBots = userBots.filter(
        b => b.status === 'online' || b.status === 'reconnecting' || b.status === 'starting'
      );
      if (activeBots.length > safeLimit) {
        // Stop excess bots
        const excess = activeBots.slice(safeLimit);
        for (const excessBot of excess) {
          excessBot.config.shouldRun = false;
          excessBot.stop();
        }
        this.saveConfigs();
      }
      // Broadcast settings and stats updates
      this.broadcastUser(userId, 'settings_update', { globalBotLimit: safeLimit });
      this.broadcastUser(userId, 'stats', this.getUserStats(userId));
    }

    return safeLimit;
  }

  private loadSavedConfigs() {
    let configs: BotConfig[] = safeReadJson<BotConfig[]>(CONFIG_FILE, []);
    if (Array.isArray(configs) && configs.length > 0) {
      // Filter out transient swarm bots so they never accumulate or block reboot recoveries
      configs = configs.filter(c => !c.id.startsWith('bot-swarm-') && !c.isSwarmBot);
    } else {
      configs = [];
    }

    for (const conf of configs) {
      if (!this.bots.has(conf.id)) {
        this.registerBot(conf);
      }
    }

    // Global Proactive Railway Memory Sweeper (Runs every 20s to prevent OOM)
    setInterval(() => {
      this.pruneAllMemory();
    }, 20000);
  }

  public getActiveUiClientCount(): number {
    let count = this.publicSseClients.size;
    for (const set of this.sseClients.values()) {
      count += set.size;
    }
    return count;
  }

  private updateUiClientActivity() {
    const isAnyClientActive = this.getActiveUiClientCount() > 0;
    for (const bot of this.bots.values()) {
      bot.setUiActive(isAnyClientActive);
    }
  }

  private deletedUserBots: Set<string> = new Set();

  private saveConfigs(forcedSyncUserId?: string) {
    try {
      const configs = Array.from(this.bots.values()).map(b => b.config);
      safeWriteJson(CONFIG_FILE, configs);

      // Group and sync to Upstash Redis Cloud Storage per user
      const userBotMap = new Map<string, BotConfig[]>();
      for (const conf of configs) {
        if (conf.userId && !conf.isSwarmBot) {
          const list = userBotMap.get(conf.userId) || [];
          list.push(conf);
          userBotMap.set(conf.userId, list);
        }
      }

      // If a user was explicitly mentioned (e.g. during delete), ensure their cloud key is updated even if empty
      if (forcedSyncUserId && !userBotMap.has(forcedSyncUserId)) {
        userBotMap.set(forcedSyncUserId, []);
      }

      for (const [uid, uBots] of userBotMap.entries()) {
        saveUserBotsToRedis(uid, uBots).catch((err) => {
          console.warn(`[Upstash Redis] Bot cloud sync error for user ${uid}:`, err);
        });
      }
    } catch (err) {
      console.error('Failed to save configs:', err);
    }
  }

  private registerBot(config: BotConfig): BotInstance {
    const instance = new BotInstance(config);

    instance.on('update', (state: BotState) => {
      if (config.userId) {
        this.broadcastUser(config.userId, 'bot_update', state);
        this.broadcastUser(config.userId, 'stats', this.getUserStats(config.userId));
      }
      this.broadcastPublicStats();
    });

    instance.on('chat', (log: any) => {
      if (config.userId) {
        this.broadcastUser(config.userId, 'chat_message', { botId: config.id, message: log });
      }
    });

    instance.on('configUpdated', (updatedConfig: BotConfig) => {
      this.saveConfigs(updatedConfig.userId);
    });

    this.bots.set(config.id, instance);
    return instance;
  }

  public isUserHydrated(userId: string): boolean {
    return this.hydratedUsers.has(userId);
  }

  public setUserHydrated(userId: string) {
    this.hydratedUsers.add(userId);
  }

  public getUserBots(userId: string, deviceId?: string, clientIp?: string, isAdmin?: boolean, createIfEmpty: boolean = true): BotState[] {
    const userBots = Array.from(this.bots.values())
      .filter(b => b.config.userId === userId)
      .map(b => b.getState());

    if (userBots.length > 0) {
      this.deletedUserBots.delete(userId);
      const bot = this.bots.get(userBots[0].id);
      if (bot) {
        let changed = false;
        if (deviceId && !bot.config.deviceId) {
          bot.config.deviceId = deviceId;
          changed = true;
        }
        if (clientIp && !bot.config.clientIp) {
          bot.config.clientIp = clientIp;
          changed = true;
        }
        if (changed) this.saveConfigs();
      }
      return userBots;
    }

    if (!createIfEmpty || this.deletedUserBots.has(userId)) {
      return [];
    }

    // New user profile creation
    const initialBot = this.createBot(userId, deviceId, clientIp, {
      name: 'NinimoBot',
      host: 'play.hypixel.net',
      port: 25565,
      username: 'NinimoBot',
      auth: 'offline',
      version: '',
      autoReconnect: true,
      reconnectDelaySeconds: 5,
      onJoinCommand: '',
      onJoinDelayMs: 2000,
      antiAfk: {
        enabled: true,
        intervalSeconds: 30,
        movementType: 'strafe_lr',
        strafeDurationMs: 400,
        swingArm: true,
        sneakWiggle: true,
      },
      shouldRun: false,
    }, isAdmin);
    return [initialBot];
  }

  public syncUserBots(
    userId: string,
    clientBots: BotConfig[],
    deviceId?: string,
    clientIp?: string
  ): BotState[] {
    if (!Array.isArray(clientBots) || clientBots.length === 0) {
      return this.getUserBots(userId, deviceId, clientIp);
    }

    let userExistingBots = Array.from(this.bots.values()).filter((b) => b.config.userId === userId);

    // If the only bot on the server is a stopped, untouched placeholder 'NinimoBot', and incoming client bots has real bots with different IDs, clean up the dummy placeholder
    if (
      userExistingBots.length === 1 &&
      userExistingBots[0].config.name === 'NinimoBot' &&
      userExistingBots[0].config.host === 'play.hypixel.net' &&
      userExistingBots[0].getState().status === 'stopped' &&
      !clientBots.some((cb) => cb.id === userExistingBots[0].config.id)
    ) {
      const dummyId = userExistingBots[0].config.id;
      userExistingBots[0].stop();
      this.bots.delete(dummyId);
      userExistingBots = [];
    }

    const limit = this.getGlobalBotLimit();

    for (const rawBot of clientBots) {
      if (!rawBot || !rawBot.id) continue;

      // Cross-account leakage protection
      if (rawBot.userId && rawBot.userId !== userId) {
        continue;
      }

      const botOnSystem = this.bots.get(rawBot.id);
      if (botOnSystem && botOnSystem.config.userId !== userId) {
        continue;
      }

      const isPlaceholderHypixel = ((rawBot.host || '').toLowerCase().includes('hypixel')) && (rawBot.auth === 'offline' || !rawBot.auth);
      const isDefaultNinimo = rawBot.name === 'NinimoBot' && (rawBot.host || '').toLowerCase().includes('hypixel');
      const isPlaceholder = isPlaceholderHypixel || isDefaultNinimo;

      const existing = this.getUserBot(userId, rawBot.id);
      if (existing) {
        const wasStopped = existing.status === 'stopped';
        const shouldAutoConnect = !isPlaceholder && rawBot.shouldRun === true;
        existing.updateConfig({
          name: rawBot.name || existing.config.name,
          host: rawBot.host || existing.config.host,
          port: rawBot.port || existing.config.port,
          username: rawBot.username || existing.config.username,
          auth: rawBot.auth || existing.config.auth,
          password: rawBot.password !== undefined ? rawBot.password : existing.config.password,
          version: rawBot.version !== undefined ? rawBot.version : existing.config.version,
          autoReconnect: rawBot.autoReconnect !== undefined ? rawBot.autoReconnect : existing.config.autoReconnect,
          reconnectDelaySeconds: rawBot.reconnectDelaySeconds || existing.config.reconnectDelaySeconds,
          onJoinCommand: rawBot.onJoinCommand !== undefined ? rawBot.onJoinCommand : existing.config.onJoinCommand,
          onJoinDelayMs: rawBot.onJoinDelayMs || existing.config.onJoinDelayMs,
          antiAfk: rawBot.antiAfk || existing.config.antiAfk,
          shouldRun: shouldAutoConnect,
        });

        // If bot was previously running before update/restart, auto-connect it.
        // If it was stopped or placeholder, leave it stopped.
        if (wasStopped && shouldAutoConnect && !existing.config.isSwarmBot) {
          setTimeout(() => {
            if (existing.status === 'stopped' && existing.config.shouldRun === true) {
              console.log(`[AUTO-RECONNECT BACKUP] Auto-connecting previously active bot "${existing.config.name}" for user ${userId}...`);
              existing.start();
            }
          }, 300);
        }
      } else {
        const currentCount = Array.from(this.bots.values()).filter((b) => b.config.userId === userId).length;
        if (currentCount < Math.max(limit, 10)) {
          const shouldAutoConnect = !isPlaceholder && rawBot.shouldRun === true;
          const newConfig: BotConfig = {
            ...rawBot,
            id: rawBot.id,
            userId,
            deviceId: deviceId || rawBot.deviceId,
            clientIp: clientIp || rawBot.clientIp,
            name: rawBot.name || 'NinimoBot',
            host: rawBot.host || 'play.hypixel.net',
            port: Number(rawBot.port) || 25565,
            username: rawBot.username || 'NinimoBot',
            auth: rawBot.auth || 'offline',
            password: rawBot.password || '',
            version: rawBot.version || '',
            autoReconnect: rawBot.autoReconnect !== undefined ? rawBot.autoReconnect : true,
            reconnectDelaySeconds: rawBot.reconnectDelaySeconds || 5,
            onJoinCommand: rawBot.onJoinCommand || '',
            onJoinDelayMs: rawBot.onJoinDelayMs || 2000,
            antiAfk: rawBot.antiAfk || {
              enabled: true,
              intervalSeconds: 20,
              movementType: 'safe_in_place',
              strafeDurationMs: 400,
              swingArm: true,
              sneakWiggle: true,
            },
            shouldRun: shouldAutoConnect,
          };
          const newInstance = this.registerBot(newConfig);
          if (shouldAutoConnect && !newConfig.isSwarmBot) {
            setTimeout(() => {
              if (newInstance.status === 'stopped' && newInstance.config.shouldRun === true) {
                console.log(`[AUTO-RECONNECT BACKUP] Auto-connecting previously active bot "${newConfig.name}" for user ${userId}...`);
                newInstance.start();
              }
            }, 300);
          }
        }
      }
    }

    this.saveConfigs();
    return this.getUserBots(userId, deviceId, clientIp);
  }

  public getUserBot(userId: string, botId: string): BotInstance | undefined {
    const bot = this.bots.get(botId);
    if (!bot || bot.config.userId !== userId) {
      return undefined;
    }
    return bot;
  }

  public createBot(
    userId: string,
    deviceId?: string,
    clientIp?: string,
    data?: Partial<BotConfig>,
    isPrivileged?: boolean
  ): BotState {
    const limit = this.getGlobalBotLimit();

    if (!isPrivileged) {
      // Bot Profile Limit per User Account
      const existingUserBots = Array.from(this.bots.values()).filter(b => b.config.userId === userId);
      if (existingUserBots.length >= limit) {
        throw new Error(`Account bot limit reached: Current limit is ${limit} bot${limit > 1 ? 's' : ''} per account profile.`);
      }
    }

    const payload = data || {};
    const id = `bot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newConfig: BotConfig = {
      id,
      userId,
      deviceId,
      clientIp,
      name: payload.name || 'NinimoBot',
      host: payload.host || 'play.hypixel.net',
      port: Number(payload.port) || 25565,
      username: payload.username || 'NinimoBot',
      auth: payload.auth || 'offline',
      password: payload.password || '',
      version: payload.version || '',
      autoReconnect: payload.autoReconnect !== undefined ? payload.autoReconnect : true,
      reconnectDelaySeconds: payload.reconnectDelaySeconds || 5,
      onJoinCommand: payload.onJoinCommand || '',
      onJoinDelayMs: payload.onJoinDelayMs || 2000,
      antiAfk: {
        enabled: payload.antiAfk?.enabled !== undefined ? payload.antiAfk.enabled : true,
        intervalSeconds: payload.antiAfk?.intervalSeconds || 20,
        movementType: payload.antiAfk?.movementType || 'safe_in_place',
        strafeDurationMs: payload.antiAfk?.strafeDurationMs || 400,
        swingArm: payload.antiAfk?.swingArm !== undefined ? payload.antiAfk.swingArm : true,
        sneakWiggle: payload.antiAfk?.sneakWiggle !== undefined ? payload.antiAfk.sneakWiggle : true,
      },
    };

    const bot = this.registerBot(newConfig);
    this.saveConfigs(userId);
    this.broadcastUser(userId, 'bot_created', bot.getState());
    this.broadcastUser(userId, 'stats', this.getUserStats(userId));
    this.broadcastPublicStats();
    return bot.getState();
  }

  public updateBot(userId: string, botId: string, updates: Partial<BotConfig>): BotState | null {
    const bot = this.getUserBot(userId, botId);
    if (!bot) return null;

    const safeUpdates = { ...updates };
    delete (safeUpdates as any).userId;
    delete (safeUpdates as any).id;

    bot.updateConfig(safeUpdates);
    this.saveConfigs(userId);
    this.broadcastUser(userId, 'bot_update', bot.getState());
    this.broadcastPublicStats();
    return bot.getState();
  }

  public deleteBot(userId: string, botId: string): boolean {
    const bot = this.getUserBot(userId, botId);
    if (!bot) return false;

    bot.stop();
    this.bots.delete(botId);
    this.saveConfigs(userId);
    this.broadcastUser(userId, 'bot_deleted', { id: botId });
    this.broadcastUser(userId, 'stats', this.getUserStats(userId));
    this.broadcastPublicStats();
    return true;
  }

  public startBot(
    userId: string,
    botId: string,
    clientIp?: string,
    deviceId?: string,
    isPrivileged?: boolean
  ): boolean {
    const bot = this.getUserBot(userId, botId);
    if (!bot) return false;

    if (clientIp) bot.config.clientIp = clientIp;
    if (deviceId) bot.config.deviceId = deviceId;
    this.saveConfigs();

    if (!isPrivileged && !bot.config.isSwarmBot) {
      const limit = this.getGlobalBotLimit();

      // 1. Check account active concurrency
      const activeUserBots = Array.from(this.bots.values()).filter(
        b => b.config.userId === userId &&
             b.config.id !== botId &&
             !b.config.isSwarmBot &&
             !b.config.id.startsWith('bot-swarm-') &&
             (b.status === 'online' || b.status === 'reconnecting' || b.status === 'starting')
      );
      if (activeUserBots.length >= limit) {
        throw new Error(`Active bot limit reached: Current limit is ${limit} running bot${limit > 1 ? 's' : ''} for your account. Please stop a running bot first.`);
      }

      // 2. Check Device active concurrency across ALL accounts on this browser/device (excluding admin bots & swarm bots)
      const targetDeviceId = deviceId || bot.config.deviceId;
      if (targetDeviceId && targetDeviceId.length > 5) {
        const activeDeviceBots = Array.from(this.bots.values()).filter(
          b => b.config.deviceId === targetDeviceId &&
               b.config.id !== botId &&
               !authManager.isUserAdmin(b.config.userId) &&
               !b.config.isSwarmBot &&
               !b.config.id.startsWith('bot-swarm-') &&
               (b.status === 'online' || b.status === 'reconnecting' || b.status === 'starting')
        );
        if (activeDeviceBots.length >= limit) {
          throw new Error(`Shared bot limit reached: You are running ${limit} active bot${limit > 1 ? 's' : ''} across your accounts on this device. Stop a running bot in one of your accounts to activate this one.`);
        }
      }

      // 3. Check Network IP active concurrency across ALL accounts on this IP network (excluding admin bots & swarm bots)
      const targetIp = clientIp || bot.config.clientIp;
      if (targetIp && targetIp !== 'unknown' && !targetIp.startsWith('127.') && targetIp !== '::1') {
        const activeIpBots = Array.from(this.bots.values()).filter(
          b => b.config.clientIp === targetIp &&
               b.config.id !== botId &&
               !authManager.isUserAdmin(b.config.userId) &&
               !b.config.isSwarmBot &&
               !b.config.id.startsWith('bot-swarm-') &&
               (b.status === 'online' || b.status === 'reconnecting' || b.status === 'starting')
        );
        if (activeIpBots.length >= limit) {
          throw new Error(`Network bot limit reached: You are running ${limit} active bot${limit > 1 ? 's' : ''} across accounts on this network/IP. Stop a running bot on your other account to activate this one.`);
        }
      }
    }

    bot.config.shouldRun = true;
    bot.config.lastStartedAt = Date.now();

    // Broadcast starting state immediately to UI clients
    this.broadcastUser(userId, 'bot_update', bot.getState());
    this.broadcastPublicStats();

    // Start bot network connection immediately
    bot.start();

    // Persist configuration in background tick to prevent I/O blocking
    setImmediate(() => {
      this.saveConfigs();
    });

    return true;
  }

  public stopBot(userId: string, botId: string): boolean {
    const bot = this.getUserBot(userId, botId);
    if (!bot) return false;
    bot.config.shouldRun = false;
    this.saveConfigs();
    bot.stop();
    this.broadcastPublicStats();
    return true;
  }

  public restartBot(userId: string, botId: string): boolean {
    const bot = this.getUserBot(userId, botId);
    if (!bot) return false;
    bot.restart();
    return true;
  }

  public sendChat(userId: string, botId: string, message: string): boolean {
    const bot = this.getUserBot(userId, botId);
    if (!bot) return false;
    return bot.sendChat(message);
  }

  public clearChat(userId: string, botId: string): boolean {
    const bot = this.getUserBot(userId, botId);
    if (!bot) return false;
    bot.clearChatHistory();
    this.broadcastUser(userId, 'bot_update', bot.getState());
    return true;
  }

  public getUserDefaults(userId: string): any {
    try {
      const data = safeReadJson<Record<string, any>>(USER_DEFAULTS_FILE, {});
      if (data && data[userId]) {
        return data[userId];
      }
    } catch {}
    return null;
  }

  public saveUserDefaults(userId: string, defaults: any): void {
    try {
      const data = safeReadJson<Record<string, any>>(USER_DEFAULTS_FILE, {});
      data[userId] = defaults;
      safeWriteJson(USER_DEFAULTS_FILE, data);
    } catch (err) {
      console.error('Failed to save user-defaults.json:', err);
    }
  }

  public getUserStats(userId: string): GlobalStats {
    let totalBots = 0;
    let activeBots = 0;
    let reconnectingBots = 0;
    let stoppedBots = 0;
    let totalUptimeSeconds = 0;

    for (const bot of this.bots.values()) {
      if (bot.config.userId === userId) {
        totalBots++;
        if (bot.status === 'online') {
          activeBots++;
          if (bot.onlineSince) {
            totalUptimeSeconds += Math.floor((Date.now() - bot.onlineSince) / 1000);
          }
        } else if (bot.status === 'reconnecting' || bot.status === 'starting') {
          reconnectingBots++;
        } else {
          stoppedBots++;
        }
      }
    }

    return {
      totalBots,
      activeBots,
      reconnectingBots,
      stoppedBots,
      totalUptimeSeconds,
    };
  }

  // Admin Fleet and Bot Control
  public getAllBotsAdmin(): {
    bot: BotState;
    userId?: string;
  }[] {
    return Array.from(this.bots.values()).map((b) => ({
      bot: b.getState(),
      userId: b.config.userId,
    }));
  }

  public getBotsByUserId(userId: string): BotState[] {
    return Array.from(this.bots.values())
      .filter((b) => b.config.userId === userId)
      .map((b) => b.getState());
  }

  public getBot(botId: string): BotInstance | undefined {
    return this.bots.get(botId);
  }

  public adminStartBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;
    bot.start();
    if (bot.config.userId) {
      this.broadcastUser(bot.config.userId, 'bot_update', bot.getState());
    }
    return true;
  }

  public adminStopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;
    bot.stop();
    if (bot.config.userId) {
      this.broadcastUser(bot.config.userId, 'bot_update', bot.getState());
    }
    return true;
  }

  public adminDeleteBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;
    bot.stop();
    this.bots.delete(botId);
    this.saveConfigs();
    if (bot.config.userId) {
      this.broadcastUser(bot.config.userId, 'bot_deleted', { id: botId });
      this.broadcastUser(bot.config.userId, 'stats', this.getUserStats(bot.config.userId));
    }
    return true;
  }

  public deleteAllBotsForUser(userId: string): number {
    const userBots = Array.from(this.bots.values()).filter((b) => b.config.userId === userId);
    for (const b of userBots) {
      b.stop();
      this.bots.delete(b.config.id);
      this.broadcastUser(userId, 'bot_deleted', { id: b.config.id });
    }
    if (userBots.length > 0) {
      this.saveConfigs();
      this.broadcastPublicStats();
    }
    return userBots.length;
  }

  // SSE per-user subscription
  public addSseClient(userId: string, cb: (data: any) => void) {
    if (!this.sseClients.has(userId)) {
      this.sseClients.set(userId, new Set());
    }
    this.sseClients.get(userId)!.add(cb);
    this.updateUiClientActivity();
  }

  public removeSseClient(userId: string, cb: (data: any) => void) {
    const set = this.sseClients.get(userId);
    if (set) {
      set.delete(cb);
      if (set.size === 0) {
        this.sseClients.delete(userId);
      }
    }
    this.updateUiClientActivity();
  }

  private broadcastUser(userId: string, event: string, payload: any) {
    const set = this.sseClients.get(userId);
    if (!set) return;

    const msg = { event, data: payload, timestamp: Date.now() };
    for (const client of set) {
      try {
        client(msg);
      } catch {
        set.delete(client);
      }
    }
  }

  // Public Platform Metrics & Real-time Live Counters
  public getPlatformPublicStats(): PublicPlatformStats {
    let activeBotsOnline = 0;

    for (const bot of this.bots.values()) {
      if (bot.status === 'online' || bot.status === 'reconnecting' || bot.status === 'starting') {
        activeBotsOnline++;
      }
    }

    return {
      activeBotsOnline,
    };
  }

  public addPublicSseClient(cb: (data: any) => void) {
    this.publicSseClients.add(cb);
    this.updateUiClientActivity();
  }

  public removePublicSseClient(cb: (data: any) => void) {
    this.publicSseClients.delete(cb);
    this.updateUiClientActivity();
  }

  public broadcastGlobalNotification(title: string, body: string) {
    const msg = { event: "admin_notification", data: { title, body }, timestamp: Date.now() };
    for (const [userId, set] of this.sseClients.entries()) {
      for (const client of set) {
        client(msg);
      }
    }
  }

  public broadcastPublicStats() {
    if (this.publicSseClients.size === 0) return;
    const stats = this.getPlatformPublicStats();
    const msg = { event: 'public_stats_update', data: stats, timestamp: Date.now() };
    for (const client of this.publicSseClients) {
      try {
        client(msg);
      } catch {
        this.publicSseClients.delete(client);
      }
    }
  }

  public async createAndLaunchSwarm(
    userId: string,
    deviceId: string | undefined,
    clientIp: string | undefined,
    options: {
      count: number;
      baseName: string;
      host: string;
      port: number;
      version?: string;
      auth?: 'offline' | 'microsoft';
      password?: string;
      onJoinCommand?: string;
      autoStart?: boolean;
    }
  ): Promise<BotState[]> {
    const rawCount = Math.floor(Number(options.count) || 8);
    const count = Math.max(1, Math.min(25, rawCount));
    const baseName = (options.baseName || 'Ninimo').trim();
    const createdBots: BotState[] = [];

    // Clean up any previous swarm bots belonging to this user to prevent piling up
    const staleSwarmBots = Array.from(this.bots.values()).filter(
      b => b.config.userId === userId && (b.config.isSwarmBot || b.config.id.startsWith('bot-swarm-'))
    );
    for (const stale of staleSwarmBots) {
      try {
        stale.stop();
        this.bots.delete(stale.config.id);
      } catch {}
    }

    for (let i = 1; i <= count; i++) {
      const botName = `${baseName}${i}`;
      const id = `bot-swarm-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      const newConfig: BotConfig = {
        id,
        userId,
        deviceId,
        clientIp,
        isSwarmBot: true, // Crucial: marks bot as transient swarm test bot
        name: botName,
        host: options.host || '127.0.0.1',
        port: Number(options.port) || 25565,
        username: botName,
        auth: options.auth || 'offline',
        password: options.password || '',
        version: options.version || '',
        autoReconnect: true,
        reconnectDelaySeconds: 5,
        onJoinCommand: options.onJoinCommand || '',
        onJoinDelayMs: 2000,
        antiAfk: {
          enabled: true,
          intervalSeconds: 30,
          movementType: 'strafe_lr',
          strafeDurationMs: 400,
          swingArm: true,
          sneakWiggle: true,
        },
        shouldRun: false, // Never auto-resume swarm bots on container restart
      };

      const botInstance = this.registerBot(newConfig);
      createdBots.push(botInstance.getState());
      this.broadcastUser(userId, 'bot_created', botInstance.getState());
    }

    this.saveConfigs();
    this.broadcastUser(userId, 'stats', this.getUserStats(userId));
    this.broadcastPublicStats();

    // If autoStart is true, start bots staggered by 2.0s to prevent server throttle
    if (options.autoStart !== false) {
      let delay = 0;
      for (const botState of createdBots) {
        setTimeout(() => {
          try {
            if (this.bots.has(botState.id)) {
              this.startBot(userId, botState.id, clientIp, deviceId, true);
            }
          } catch (e) {
            console.error(`[SWARM] Failed to start bot ${botState.config.name}:`, e);
          }
        }, delay);
        delay += 2000;
      }
    }

    return createdBots;
  }

  public purgeAllSwarmBots(): number {
    let purged = 0;
    for (const [id, bot] of this.bots.entries()) {
      if (bot.config.isSwarmBot || id.startsWith('bot-swarm-')) {
        try {
          bot.stop();
          this.bots.delete(id);
          purged++;
        } catch {}
      }
    }
    this.saveConfigs();
    this.broadcastPublicStats();
    return purged;
  }

  public resetUserBot(userId: string, botId: string): boolean {
    const bot = this.getUserBot(userId, botId);
    if (!bot) return false;
    bot.stop();
    bot.reconnectCount = 0;
    bot.lastError = null;
    setTimeout(() => {
      bot.start();
    }, 1200);
    return true;
  }

  public stopAllUserBots(userId: string) {
    for (const bot of this.bots.values()) {
      if (bot.config.userId === userId) {
        bot.config.shouldRun = false;
        bot.stop();
      }
    }
    this.saveConfigs();
    this.broadcastUser(userId, 'stats', this.getUserStats(userId));
    this.broadcastPublicStats();
  }

  public deleteAllUserBots(userId: string) {
    const toDelete: string[] = [];
    for (const [id, bot] of this.bots.entries()) {
      if (bot.config.userId === userId) {
        bot.stop();
        toDelete.push(id);
      }
    }
    for (const id of toDelete) {
      this.bots.delete(id);
      this.broadcastUser(userId, 'bot_deleted', { id });
    }
    this.saveConfigs();
    this.broadcastUser(userId, 'stats', this.getUserStats(userId));
    this.broadcastPublicStats();
  }

  public getGlobalStats(): GlobalStats {
    let totalBots = this.bots.size;
    let activeBots = 0;
    let reconnectingBots = 0;
    let stoppedBots = 0;
    let totalUptimeSeconds = 0;

    for (const bot of this.bots.values()) {
      const state = bot.getState();
      if (bot.status === 'online') activeBots++;
      else if (bot.status === 'reconnecting' || bot.status === 'starting') reconnectingBots++;
      else stoppedBots++;

      totalUptimeSeconds += state.uptimeSeconds;
    }

    return {
      totalBots,
      activeBots,
      reconnectingBots,
      stoppedBots,
      totalUptimeSeconds
    };
  }

  // Super Admin Fleet Operations
  public massFleetAction(action: 'start_all' | 'stop_all' | 'reconnect_all' | 'broadcast_command', commandText?: string): {
    affectedCount: number;
    message: string;
  } {
    let affected = 0;
    const allBots = Array.from(this.bots.values());

    if (action === 'start_all') {
      for (const bot of allBots) {
        if (bot.status !== 'online' && bot.status !== 'starting') {
          bot.config.shouldRun = true;
          bot.start();
          affected++;
          if (bot.config.userId) {
            this.broadcastUser(bot.config.userId, 'bot_update', bot.getState());
          }
        }
      }
      this.saveConfigs();
      this.broadcastPublicStats();
      return { affectedCount: affected, message: `Successfully started ${affected} bot(s) across all accounts.` };
    }

    if (action === 'stop_all') {
      for (const bot of allBots) {
        if (bot.status === 'online' || bot.status === 'starting' || bot.status === 'reconnecting') {
          bot.config.shouldRun = false;
          bot.stop();
          affected++;
          if (bot.config.userId) {
            this.broadcastUser(bot.config.userId, 'bot_update', bot.getState());
          }
        }
      }
      this.saveConfigs();
      this.broadcastPublicStats();
      return { affectedCount: affected, message: `Successfully stopped ${affected} bot(s) across all accounts.` };
    }

    if (action === 'reconnect_all') {
      for (const bot of allBots) {
        bot.restart();
        affected++;
        if (bot.config.userId) {
          this.broadcastUser(bot.config.userId, 'bot_update', bot.getState());
        }
      }
      this.saveConfigs();
      return { affectedCount: affected, message: `Reconnecting ${affected} bot(s)...` };
    }

    if (action === 'broadcast_command' && commandText) {
      for (const bot of allBots) {
        if (bot.status === 'online') {
          bot.sendChat(commandText);
          affected++;
        }
      }
      return { affectedCount: affected, message: `Broadcasted command "${commandText}" to ${affected} online bot(s).` };
    }

    return { affectedCount: 0, message: 'No action performed' };
  }

  public pruneAllMemory(): { botsPruned: number; freedEstKb: number } {
    let count = 0;
    for (const bot of this.bots.values()) {
      bot.pruneMemoryUsage();
      count++;
    }
    if (global.gc) {
      try {
        global.gc();
      } catch {}
    }
    return { botsPruned: count, freedEstKb: Math.round(count * 1450) };
  }

  public shutdown(): void {
    console.log('[SHUTDOWN] Saving bot configurations and stopping bots...');
    try {
      this.saveConfigs();
      this.saveSettings();
      for (const bot of this.bots.values()) {
        try {
          bot.stop();
        } catch {}
      }
    } catch (err) {
      console.error('Error shutting down BotManager:', err);
    }
  }
}

export const botManager = new BotManager();
