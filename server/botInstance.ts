import { EventEmitter } from 'events';
import mineflayer from 'mineflayer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;

import { BotConfig, BotState, BotStatus, ChatMessage } from '../src/types.js';
import { minecraftFormatToHtml, stripMinecraftCodes } from './minecraftChatUtils.js';

/**
 * BotInstance powered directly by Slobos-AFK-Aternos-Bot engine
 * https://github.com/Sloboscc/Slobos-AFK-Aternos-Bot
 * 
 * Features integrated:
 * - 600,000ms checkTimeoutInterval for Aternos lag resilience
 * - Auto server version detection (version: false)
 * - 150s Aternos spawn timeout handler
 * - Slobos Movements with liquidCost/fallDamageCost (1000) and zero physics freezing
 * - Reactive Auto-Auth (/register & /login prompts detector with Korean & English support)
 * - Circle-walk pathfinder movement (radius: 4, speed: 3000ms, 2000ms path gap)
 * - Random-jump & Look-around routines
 * - Anti-AFK utils (arm swinging, hotbar cycling, teabag sneak wiggle, micro-walk)
 * - Avoid mobs & players (<5 blocks)
 * - Combat 1.9+ cooldown weapon/hand attack & auto-eat food items
 * - Bed sleep at night (12500-23500)
 * - Slobos leave & rejoin session cycler (leaveRejoin.js)
 * - Single-source-of-truth reconnection on 'end' with throttle detection on 'kicked'
 * - Exponential backoff + jitter (or 60-120s extended delay if throttled)
 */
function formatConnectionError(msg: string, host: string, port: number): string {
  const lower = (msg || '').toLowerCase();
  if (
    lower.includes("unsupported protocol version '-1'") ||
    lower.includes("protocol version '-1'") ||
    lower.includes("version '-1'") ||
    lower.includes('unsupported protocol')
  ) {
    return `Server is currently offline or unreachable at ${host}:${port}. Waiting to reconnect...`;
  }
  if (lower.includes('econnrefused')) {
    return `Server is offline / connection refused at ${host}:${port}. Waiting to reconnect...`;
  }
  if (lower.includes('etimedout')) {
    return `Connection timed out (server may be offline or loading chunks). Waiting to reconnect...`;
  }
  if (lower.includes('enotfound')) {
    return `Server address "${host}" not found. Waiting to reconnect...`;
  }
  if (lower.includes('econnreset') || lower.includes('read econnreset')) {
    return `Connection reset by server. Waiting to reconnect...`;
  }
  if (lower.includes('ehostunreach')) {
    return `Host unreachable at ${host}:${port}. Waiting to reconnect...`;
  }
  return msg;
}

export class BotInstance extends EventEmitter {
  public config: BotConfig;
  public status: BotStatus = 'stopped';
  public health: number = 20;
  public maxHealth: number = 20;
  public food: number = 20;
  public saturation: number = 5;
  public experience = { level: 0, points: 0, progress: 0 };
  public position = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
  public dimension: string = 'overworld';
  public gamemode: string = 'survival';
  public ping: number = 0;
  public onlineSince: number | null = null;
  public reconnectCount: number = 0;
  public nextReconnectIn: number | null = null;
  public lastError: string | null = null;
  public chatHistory: ChatMessage[] = [];
  public inventory: any[] = [];
  public quickBarSlot: number = 0;

  // Internal Mineflayer & Slobos state
  private bot: any = null;
  private isManuallyStopped: boolean = false;
  private isReconnecting: boolean = false;
  private spawnHandled: boolean = false;
  private wasThrottled: boolean = false;
  private botStateConnected: boolean = false;
  private lastActivity: number = Date.now();

  // Timers and intervals management
  private activeIntervals: NodeJS.Timeout[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectCountdownTimer: NodeJS.Timeout | null = null;
  private connectionTimeoutId: NodeJS.Timeout | null = null;
  private syncPollTimer: NodeJS.Timeout | null = null;
  private leaveRejoinTimer: NodeJS.Timeout | null = null;
  private joinCommandTimer: NodeJS.Timeout | null = null;
  private mcData: any = null;
  private defaultMove: any = null;

  constructor(config: BotConfig) {
    super();
    this.config = { ...config };
  }

  public getState(): BotState {
    const uptimeSeconds = this.onlineSince ? Math.floor((Date.now() - this.onlineSince) / 1000) : 0;
    return {
      id: this.config.id,
      config: this.config,
      status: this.status,
      health: this.health,
      maxHealth: this.maxHealth,
      food: this.food,
      saturation: this.saturation,
      experience: this.experience,
      position: this.position,
      dimension: this.dimension,
      gamemode: this.gamemode,
      ping: this.ping,
      onlineSince: this.onlineSince,
      uptimeSeconds,
      reconnectCount: this.reconnectCount,
      nextReconnectIn: this.nextReconnectIn,
      lastError: this.lastError,
      lastAfkActionTime: this.lastActivity,
      playersNearby: [],
      chatHistory: this.chatHistory.slice(-150),
      inventory: this.inventory,
      quickBarSlot: this.quickBarSlot,
    };
  }

  public updateConfig(newConfig: Partial<BotConfig>) {
    const oldOnJoin = this.config.onJoinCommand;
    this.config = { ...this.config, ...newConfig };

    if (this.bot && this.botStateConnected) {
      if (
        newConfig.onJoinCommand !== undefined &&
        newConfig.onJoinCommand.trim() !== '' &&
        newConfig.onJoinCommand !== oldOnJoin
      ) {
        this.executeOnJoinCommand();
      }
      this.reapplyModules();
    }
    this.emitUpdate();
  }

  public start() {
    if (this.status === 'online' || this.status === 'starting' || this.isReconnecting) return;

    this.isManuallyStopped = false;
    this.status = 'starting';
    this.lastError = null;
    this.spawnHandled = false;
    this.botStateConnected = false;
    this.emitUpdate();

    this.createBot();
  }

  public stop() {
    this.isManuallyStopped = true;
    this.config.shouldRun = false;
    this.cleanupBot();
    this.status = 'stopped';
    this.onlineSince = null;
    this.botStateConnected = false;
    this.emitUpdate();
  }

  public restart() {
    this.stop();
    setTimeout(() => this.start(), 1000);
  }

  public sendChat(message: string): boolean {
    if (!this.bot || !this.botStateConnected) return false;
    try {
      this.bot.chat(message);
      this.lastActivity = Date.now();
      this.addLog('bot_sent', this.config.username, message);
      this.emitUpdate();
      return true;
    } catch (err: any) {
      this.addLog('error', undefined, `[Bot] Failed to send chat: ${err.message}`);
      return false;
    }
  }

  // ============================================================
  // BOT CREATION WITH 24/7 RECONNECTION LOGIC
  // ============================================================
  private createBot() {
    if (this.bot) {
      this.cleanupBot();
    }

    this.addLog('info', undefined, `[Bot] Connecting to ${this.config.host}:${this.config.port}...`);

    try {
      const botVersion = this.config.version && this.config.version.trim() !== '' && this.config.version !== 'auto'
        ? this.config.version
        : false;

      const options: any = {
        username: this.config.username,
        password: this.config.password || undefined,
        auth: this.config.auth || 'offline',
        host: this.config.host,
        port: this.config.port,
        version: botVersion,
        hideErrors: false,
        checkTimeoutInterval: 600000,
        defaultChatPatterns: false,
      };

      if (this.config.auth === 'microsoft' && this.config.password) {
        options.password = this.config.password;
      }

      this.bot = mineflayer.createBot(options);
      this.bot.loadPlugin(pathfinder);

      this.attachBotListeners();

      this.clearBotTimeouts();
      this.connectionTimeoutId = setTimeout(() => {
        if (!this.botStateConnected) {
          this.addLog('error', undefined, '[Bot] Connection timeout - no spawn received within 150s');
          this.cleanupBot();
          this.scheduleReconnect('Connection timeout');
        }
      }, 150000);

    } catch (err: any) {
      const cleanMsg = formatConnectionError(err.message || String(err), this.config.host, this.config.port);
      this.addLog('error', undefined, `[Bot] Failed to initialize: ${cleanMsg}`);
      this.scheduleReconnect(`Init error: ${cleanMsg}`);
    }
  }

  private attachBotListeners() {
    if (!this.bot) return;

    this.bot.once('login', () => {
      this.status = 'online';
      this.botStateConnected = true;
      this.onlineSince = Date.now();
      this.reconnectCount = 0;
      this.isReconnecting = false;
      this.lastActivity = Date.now();

      const version = this.bot?.version || 'auto';
      this.addLog('info', undefined, `[Bot] [+] Logged in to server! (Protocol: ${version})`);
      this.emitUpdate();
    });

    // Guard against spawn firing twice
    this.bot.once('spawn', () => {
      if (this.spawnHandled) return;
      this.spawnHandled = true;

      this.clearBotTimeouts();
      this.botStateConnected = true;
      this.lastActivity = Date.now();
      this.reconnectCount = 0;
      this.isReconnecting = false;

      this.addLog('info', undefined, `[Bot] [+] Successfully spawned on server! (Version: ${this.bot.version})`);

      // Execute on-join message / command reliably
      this.executeOnJoinCommand();

      // Vanilla gravity alignment (fixes physics drift, floating flags & movement kicks on Paper/anti-cheat)
      try {
        if ((this.bot as any).physics) {
          (this.bot as any).physics.gravity = 27;
        }
      } catch {}

      try {
        const mcData = require('minecraft-data')(this.bot.version);
        const defaultMove = new Movements(this.bot, mcData);
        defaultMove.allowFreeMotion = false;
        defaultMove.canDig = false;
        defaultMove.liquidCost = 1000;
        defaultMove.fallDamageCost = 1000;

        this.mcData = mcData;
        this.defaultMove = defaultMove;
        this.bot.pathfinder.setMovements(defaultMove);

        // Initialize bot modules
        this.initializeSlobosModules(mcData, defaultMove);
      } catch (err: any) {
        this.addLog('error', undefined, `[Bot] Error configuring pathfinder: ${err.message}`);
      }

      this.startSyncLoop();
      this.emitUpdate();
    });

    // Maintain vanilla physics gravity across world/dimension changes or respawns
    this.bot.on('spawn', () => {
      try {
        if ((this.bot as any)?.physics) {
          (this.bot as any).physics.gravity = 27;
        }
      } catch {}
    });

    // Keeps bot alive on servers running GrimAC 1.21.2+ (synchronizes tick_end packet on every physics tick)
    let hasTickEndSupport = true;
    this.bot.on('physicTick', async () => {
      if (!hasTickEndSupport || !this.bot) return;
      try {
        if (this.bot._client && (this.bot._client as any).state === 'play') {
          this.bot._client.write('tick_end', {});
        }
      } catch {
        // If tick_end packet does not exist on this Minecraft protocol version (<1.21.2), stop trying
        hasTickEndSupport = false;
      }
    });

    // Reactive Chat & Message Logger
    this.bot.on('message', (jsonMsg: any) => {
      if (!this.bot) return;
      const rawString = jsonMsg.toString();
      const ansiHtml = minecraftFormatToHtml(rawString);
      const cleanText = stripMinecraftCodes(rawString);
      if (!cleanText.trim()) return;

      const chatMatch = cleanText.match(/^[<\[]([A-Za-z0-9_]{3,16})[>\]]\s*(.*)$/);
      const sender = chatMatch ? chatMatch[1] : undefined;
      const type = sender ? 'chat' : 'system';
      this.addLog(type, sender, cleanText, ansiHtml);
    });

    this.bot.on('health', () => {
      if (!this.bot) return;
      this.health = Math.round(this.bot.health || 0);
      this.food = Math.round(this.bot.food || 0);
      this.saturation = Math.round(this.bot.foodSaturation || 0);
      this.emitUpdate();
    });

    this.bot.on('kicked', (reason: any) => {
      const kickReason = typeof reason === 'object' ? JSON.stringify(reason) : String(reason);
      const cleanReason = stripMinecraftCodes(kickReason);
      this.addLog('error', undefined, `[Bot] Kicked: ${cleanReason}`);

      this.botStateConnected = false;
      this.clearAllIntervals();

      const reasonStr = cleanReason.toLowerCase();
      if (
        reasonStr.includes('throttl') ||
        reasonStr.includes('wait before reconnect') ||
        reasonStr.includes('too fast')
      ) {
        this.addLog('error', undefined, '[Bot] Throttle kick detected - using extended reconnect delay (60-120s)');
        this.wasThrottled = true;
      }
    });

    this.bot.on('end', (reason: string) => {
      const cleanReason = formatConnectionError(reason || 'Connection closed', this.config.host, this.config.port);
      this.addLog('info', undefined, `[Bot] Disconnected: ${cleanReason}`);
      this.botStateConnected = false;
      this.clearAllIntervals();
      this.spawnHandled = false;

      if (!this.isManuallyStopped) {
        this.scheduleReconnect(cleanReason);
      }
    });

    this.bot.on('error', (err: any) => {
      const rawMsg = err?.message || String(err);
      const msg = formatConnectionError(rawMsg, this.config.host, this.config.port);
      this.addLog('error', undefined, `[Bot] Socket error: ${msg}`);
      // Fallback: If 'end' event does not fire after a socket error, guarantee reconnection
      setTimeout(() => {
        if (!this.botStateConnected && !this.isReconnecting && !this.isManuallyStopped && (this.config.autoReconnect !== false)) {
          this.scheduleReconnect(`Socket error: ${msg}`);
        }
      }, 3500);
    });
  }

  // ============================================================
  // ON-JOIN COMMAND / MESSAGE DISPATCHER
  // ============================================================
  private executeOnJoinCommand() {
    if (this.joinCommandTimer) {
      clearTimeout(this.joinCommandTimer);
      this.joinCommandTimer = null;
    }

    const commandPayload = (this.config.onJoinCommand || '').trim();
    if (!commandPayload) return;

    const delayMs = Math.max(100, Number(this.config.onJoinDelayMs) || 1200);
    this.addLog('info', undefined, `[Bot] On-join automation scheduled in ${(delayMs / 1000).toFixed(1)}s: "${commandPayload}"`);

    this.joinCommandTimer = setTimeout(() => {
      this.joinCommandTimer = null;
      if (!this.bot || !this.botStateConnected) return;

      // Split multiple commands if separated by newlines, semicolons, or '&&'
      const rawCommands = commandPayload
        .split(/\r?\n|;|&&/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      rawCommands.forEach((cmd, idx) => {
        setTimeout(() => {
          if (!this.bot || !this.botStateConnected) return;
          try {
            this.bot.chat(cmd);
            this.lastActivity = Date.now();
            const logText = `Auto : "${cmd}"`;
            this.addLog('bot_sent', this.config.username, logText, undefined, true);
            this.emitUpdate();
          } catch (err: any) {
            this.addLog('error', undefined, `[Bot] Failed sending join command "${cmd}": ${err.message}`);
          }
        }, idx * 350); // 350ms spacing between multiple commands
      });
    }, delayMs);
  }

  // Dynamically re-applies modules & anti-AFK settings when updated on the fly
  private reapplyModules() {
    if (!this.bot || !this.botStateConnected) return;
    this.clearAllIntervals();
    this.initializeSlobosModules(this.mcData, this.defaultMove);
  }

  // ============================================================
  // BOT MODULE INITIALIZATION
  // ============================================================
  private initializeSlobosModules(mcData: any, defaultMove: any) {
    const slobos = this.config.slobosSettings || {};

    // ---------- 1. REACTIVE AUTO AUTH (FOR PASSWORD PROMPTS) ----------
    const autoAuthPassword = slobos.autoAuth?.password || this.config.password;
    const shouldAutoAuth = slobos.autoAuth?.enabled !== false && autoAuthPassword;

    if (shouldAutoAuth) {
      let authHandled = false;
      const tryAuth = (type: 'register' | 'login') => {
        if (authHandled || !this.bot || !this.botStateConnected) return;
        authHandled = true;

        if (type === 'register') {
          const regCmd = `/register ${autoAuthPassword} ${autoAuthPassword}`;
          this.bot.chat(regCmd);
          this.addLog('bot_sent', this.config.username, `Auto : "${regCmd}"`, undefined, true);
        } else {
          const loginCmd = `/login ${autoAuthPassword}`;
          this.bot.chat(loginCmd);
          this.addLog('bot_sent', this.config.username, `Auto : "${loginCmd}"`, undefined, true);
        }
        this.emitUpdate();
      };

      this.bot.on('messagestr', (message: string) => {
        if (authHandled) return;
        const msg = message.toLowerCase();
        if (
          msg.includes('/register') ||
          msg.includes('register ') ||
          msg.includes('지정된 비밀번호')
        ) {
          tryAuth('register');
        } else if (
          msg.includes('/login') ||
          msg.includes('login ') ||
          msg.includes('로그인')
        ) {
          tryAuth('login');
        }
      });
    }

    // ---------- 2. CHAT MESSAGES (REPEAT/BROADCAST) ----------
    if (slobos.chatMessages && slobos.chatMessages.enabled && Array.isArray(slobos.chatMessages.messages)) {
      const messages = slobos.chatMessages.messages;
      if (slobos.chatMessages.repeat) {
        let i = 0;
        this.addInterval(() => {
          if (this.bot && this.botStateConnected && messages.length > 0) {
            this.bot.chat(messages[i]);
            this.lastActivity = Date.now();
            this.addLog('bot_sent', this.config.username, `Auto : "${messages[i]}"`, undefined, true);
            this.emitUpdate();
            i = (i + 1) % messages.length;
          }
        }, (slobos.chatMessages.repeatDelay || 120) * 1000);
      } else {
        messages.forEach((msg, idx) => {
          setTimeout(() => {
            if (this.bot && this.botStateConnected) {
              this.bot.chat(msg);
              this.addLog('bot_sent', this.config.username, `Auto : "${msg}"`, undefined, true);
              this.emitUpdate();
            }
          }, idx * 1000);
        });
      }
    }

    // ---------- 3. MOVE TO POSITION & CIRCLE WALK TOGGLE ----------
    const isCircleWalkActive = slobos.circleWalk?.enabled === true;

    if (slobos.position && slobos.position.enabled && !isCircleWalkActive && defaultMove) {
      try {
        this.bot.pathfinder.setMovements(defaultMove);
        this.bot.pathfinder.setGoal(new GoalBlock(slobos.position.x, slobos.position.y, slobos.position.z));
        this.addLog('info', undefined, `[Position] Navigating to (${slobos.position.x}, ${slobos.position.y}, ${slobos.position.z})...`);
      } catch (e: any) {
        this.addLog('error', undefined, `[Position] Error: ${e.message}`);
      }
    }

    // ---------- 4. ANTI-AFK ENGINE ----------
    const antiAfk = this.config.antiAfk || {
      enabled: true,
      intervalSeconds: 20,
      movementType: 'safe_in_place',
      strafeDurationMs: 400,
      swingArm: true,
      sneakWiggle: true,
    };

    if (antiAfk.enabled !== false) {
      const intervalMs = Math.max(4000, (antiAfk.intervalSeconds || 20) * 1000);
      const strafeMs = Math.max(200, antiAfk.strafeDurationMs || 350);

      this.addInterval(() => {
        if (!this.bot || !this.botStateConnected) return;
        const movType = antiAfk.movementType || 'safe_in_place';

        try {
          if (movType === 'strafe_lr') {
            if (typeof this.bot.setControlState === 'function') {
              this.bot.setControlState('left', true);
              setTimeout(() => {
                if (!this.bot || !this.botStateConnected) return;
                this.bot.setControlState('left', false);
                setTimeout(() => {
                  if (!this.bot || !this.botStateConnected) return;
                  this.bot.setControlState('right', true);
                  setTimeout(() => {
                    if (this.bot && typeof this.bot.setControlState === 'function') {
                      this.bot.setControlState('right', false);
                    }
                  }, strafeMs);
                }, 100);
              }, strafeMs);
            }
          } else if (movType === 'jump_strafe') {
            if (typeof this.bot.setControlState === 'function') {
              this.bot.setControlState('jump', true);
              this.bot.setControlState('left', true);
              setTimeout(() => {
                if (!this.bot || !this.botStateConnected) return;
                this.bot.setControlState('jump', false);
                this.bot.setControlState('left', false);
                setTimeout(() => {
                  if (!this.bot || !this.botStateConnected) return;
                  this.bot.setControlState('right', true);
                  setTimeout(() => {
                    if (this.bot && typeof this.bot.setControlState === 'function') {
                      this.bot.setControlState('right', false);
                    }
                  }, strafeMs);
                }, 100);
              }, strafeMs);
            }
          } else if (movType === 'rotate_look') {
            const yaw = Math.random() * Math.PI * 2 - Math.PI;
            const pitch = (Math.random() * Math.PI) / 2 - Math.PI / 4;
            this.bot.look(yaw, pitch, false);
          } else if (movType === 'full_routine') {
            const yaw = Math.random() * Math.PI * 2 - Math.PI;
            this.bot.look(yaw, 0, false);
            if (typeof this.bot.setControlState === 'function') {
              this.bot.setControlState('jump', true);
              this.bot.setControlState('left', true);
              setTimeout(() => {
                if (!this.bot || !this.botStateConnected) return;
                this.bot.setControlState('jump', false);
                this.bot.setControlState('left', false);
                setTimeout(() => {
                  if (!this.bot || !this.botStateConnected) return;
                  this.bot.setControlState('right', true);
                  setTimeout(() => {
                    if (this.bot && typeof this.bot.setControlState === 'function') {
                      this.bot.setControlState('right', false);
                    }
                  }, strafeMs);
                }, 100);
              }, strafeMs);
            }
          }

          // Universal actions
          if (antiAfk.swingArm !== false && typeof this.bot.swingArm === 'function') {
            this.bot.swingArm();
          }

          if (antiAfk.sneakWiggle !== false && typeof this.bot.setControlState === 'function') {
            this.bot.setControlState('sneak', true);
            setTimeout(() => {
              if (this.bot && typeof this.bot.setControlState === 'function') {
                this.bot.setControlState('sneak', false);
              }
            }, 200);
          }

          if (typeof this.bot.setQuickBarSlot === 'function') {
            const slot = Math.floor(Math.random() * 9);
            this.bot.setQuickBarSlot(slot);
            this.quickBarSlot = slot;
          }

          this.lastActivity = Date.now();
        } catch (e: any) {
          this.addLog('error', undefined, `[AntiAFK] Routine error: ${e.message}`);
        }
      }, intervalMs);

      // Sneak holding if explicitly requested in slobosSettings
      if (slobos.antiAfk?.sneak && typeof this.bot.setControlState === 'function') {
        try {
          this.bot.setControlState('sneak', true);
        } catch {}
      }
    }

    // ---------- 5. MOVEMENT MODULES ----------
    if (isCircleWalkActive && defaultMove) {
      this.startCircleWalk(defaultMove, slobos.circleWalk?.radius || 4, slobos.circleWalk?.speed || 3000);
    }

    const randomJumpEnabled = slobos.randomJump?.enabled === true;
    if (randomJumpEnabled) {
      this.startRandomJump(slobos.randomJump?.interval || 10000);
    }

    const lookAroundEnabled = slobos.lookAround?.enabled ?? true;
    if (lookAroundEnabled) {
      this.startLookAround(slobos.lookAround?.interval || 6000);
    }

    const avoidMobsEnabled = slobos.avoidMobs ?? false;
    if (avoidMobsEnabled) {
      this.avoidMobs();
    }

    // ---------- 6. CHAT RESPONDER ----------
    const chatRespondEnabled = slobos.chatRespond ?? true;
    if (chatRespondEnabled) {
      this.chatModule();
    }

    // ---------- 7. LEAVE & REJOIN CYCLER ----------
    const leaveRejoinEnabled = slobos.leaveRejoin?.enabled ?? false;
    if (leaveRejoinEnabled) {
      this.setupLeaveRejoin(slobos.leaveRejoin?.minStayMs || 120000, slobos.leaveRejoin?.maxStayMs || 600000);
    }
  }

  // ============================================================
  // SLOBOS MOVEMENT HELPERS
  // ============================================================
  private startCircleWalk(defaultMove: any, radius: number = 4, speed: number = 3000) {
    let angle = 0;
    let lastPathTime = 0;

    this.addInterval(() => {
      if (!this.bot || !this.botStateConnected || !this.bot.entity) return;
      const now = Date.now();
      if (now - lastPathTime < 2000) return; // 2s gap between path calculations
      lastPathTime = now;

      try {
        const x = this.bot.entity.position.x + Math.cos(angle) * radius;
        const z = this.bot.entity.position.z + Math.sin(angle) * radius;
        this.bot.pathfinder.setMovements(defaultMove);
        this.bot.pathfinder.setGoal(
          new GoalBlock(
            Math.floor(x),
            Math.floor(this.bot.entity.position.y),
            Math.floor(z)
          )
        );
        angle += Math.PI / 4;
        this.lastActivity = Date.now();
      } catch (e: any) {
        this.addLog('error', undefined, `[CircleWalk] Error: ${e.message}`);
      }
    }, speed);
  }

  private startRandomJump(interval: number = 10000) {
    this.addInterval(() => {
      if (!this.bot || !this.botStateConnected || typeof this.bot.setControlState !== 'function') return;
      try {
        this.bot.setControlState('jump', true);
        setTimeout(() => {
          if (this.bot && typeof this.bot.setControlState === 'function') {
            this.bot.setControlState('jump', false);
          }
        }, 300);
        this.lastActivity = Date.now();
      } catch (e: any) {
        this.addLog('error', undefined, `[RandomJump] Error: ${e.message}`);
      }
    }, interval);
  }

  private startLookAround(interval: number = 5000) {
    this.addInterval(() => {
      if (!this.bot || !this.botStateConnected) return;
      try {
        const yaw = Math.random() * Math.PI * 2 - Math.PI;
        const pitch = (Math.random() * Math.PI) / 2 - Math.PI / 4;
        this.bot.look(yaw, pitch, false);
        this.lastActivity = Date.now();
      } catch (e: any) {
        this.addLog('error', undefined, `[LookAround] Error: ${e.message}`);
      }
    }, interval);
  }

  private avoidMobs() {
    const safeDistance = 5;
    this.addInterval(() => {
      if (!this.bot || !this.botStateConnected || !this.bot.entity || typeof this.bot.setControlState !== 'function') return;
      try {
        const entities = Object.values(this.bot.entities || {}).filter(
          (e: any) => e.type === 'mob' || (e.type === 'player' && e.username !== this.bot.username)
        );
        for (const e of entities as any[]) {
          if (!e.position) continue;
          const distance = this.bot.entity.position.distanceTo(e.position);
          if (distance < safeDistance) {
            this.bot.setControlState('back', true);
            setTimeout(() => {
              if (this.bot && typeof this.bot.setControlState === 'function') {
                this.bot.setControlState('back', false);
              }
            }, 500);
            break;
          }
        }
      } catch (e: any) {
        this.addLog('error', undefined, `[AvoidMobs] Error: ${e.message}`);
      }
    }, 2000);
  }

  private combatModule(attackMobs: boolean, autoEat: boolean) {
    let lastAttackTime = 0;
    let lockedTarget: any = null;
    let lockedTargetExpiry = 0;

    if (attackMobs) {
      this.bot.on('physicsTick', () => {
        if (!this.bot || !this.botStateConnected || !this.bot.entity) return;
        const now = Date.now();
        // 1.9+ attack cooldown - respect at least 620ms between swings
        if (now - lastAttackTime < 620) return;

        try {
          if (
            lockedTarget &&
            now < lockedTargetExpiry &&
            this.bot.entities[lockedTarget.id] &&
            lockedTarget.position
          ) {
            const dist = this.bot.entity.position.distanceTo(lockedTarget.position);
            if (dist < 4) {
              this.bot.attack(lockedTarget);
              lastAttackTime = now;
              return;
            } else {
              lockedTarget = null;
            }
          }

          const mobs = Object.values(this.bot.entities || {}).filter(
            (e: any) => e.type === 'mob' && e.position && this.bot.entity.position.distanceTo(e.position) < 4
          );

          if (mobs.length > 0) {
            lockedTarget = mobs[0];
            lockedTargetExpiry = now + 3000;
            this.bot.attack(lockedTarget);
            lastAttackTime = now;
          }
        } catch (e: any) {
          this.addLog('error', undefined, `[Combat] Error: ${e.message}`);
        }
      });
    }

    if (autoEat) {
      this.bot.on('health', () => {
        if (!this.bot || !this.botStateConnected) return;
        try {
          if (this.bot.food < 14) {
            const food = this.bot.inventory?.items()?.find((i: any) => i.foodPoints && i.foodPoints > 0);
            if (food) {
              this.bot.equip(food, 'hand')
                .then(() => this.bot.consume())
                .catch((e: any) => this.addLog('error', undefined, `[AutoEat] Error: ${e.message}`));
            }
          }
        } catch (e: any) {
          this.addLog('error', undefined, `[AutoEat] Error: ${e.message}`);
        }
      });
    }
  }

  private bedModule() {
    let isTryingToSleep = false;
    this.addInterval(async () => {
      if (!this.bot || !this.botStateConnected || !this.bot.time) return;
      try {
        const isNight = this.bot.time.timeOfDay >= 12500 && this.bot.time.timeOfDay <= 23500;
        if (isNight && !isTryingToSleep) {
          const bedBlock = this.bot.findBlock({
            matching: (block: any) => block.name && block.name.includes('bed'),
            maxDistance: 8,
          });
          if (bedBlock) {
            isTryingToSleep = true;
            try {
              await this.bot.sleep(bedBlock);
              this.addLog('info', undefined, '[Bed] Sleeping...');
            } catch {
              // Monsters nearby or not night enough
            } finally {
              isTryingToSleep = false;
            }
          }
        }
      } catch (e: any) {
        isTryingToSleep = false;
        this.addLog('error', undefined, `[Bed] Error: ${e.message}`);
      }
    }, 10000);
  }

  private chatModule() {
    this.bot.on('chat', (username: string, message: string) => {
      if (!this.bot || username === this.bot.username) return;
      try {
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
          const resp = `Hello, ${username}!`;
          this.bot.chat(resp);
          this.addLog('bot_sent', this.config.username, `Auto : "${resp}"`, undefined, true);
          this.emitUpdate();
        }
        if (message.startsWith('!tp ')) {
          const target = message.split(' ')[1];
          if (target) {
            const tpCmd = `/tp ${target}`;
            this.bot.chat(tpCmd);
            this.addLog('bot_sent', this.config.username, `Auto : "${tpCmd}"`, undefined, true);
            this.emitUpdate();
          }
        }
      } catch (e: any) {
        this.addLog('error', undefined, `[Chat] Error: ${e.message}`);
      }
    });
  }

  // Session cycle logic
  private setupLeaveRejoin(minStayMs: number = 120000, maxStayMs: number = 600000) {
    const stayTime = Math.floor(Math.random() * (maxStayMs - minStayMs + 1)) + minStayMs;
    this.addLog('info', undefined, `[Session] Scheduled session cycle in ${Math.round(stayTime / 1000)}s`);

    this.leaveRejoinTimer = setTimeout(() => {
      if (this.bot && this.botStateConnected && !this.isManuallyStopped) {
        this.addLog('info', undefined, '[Session] Cycling session (leave & rejoin)');
        try {
          this.bot.quit();
        } catch {}
      }
    }, stayTime);
  }

  // ============================================================
  // RECONNECTION & TIMEOUT MANAGEMENT
  // ============================================================
  private scheduleReconnect(reason: string) {
    this.cleanupBot();
    this.status = 'error';
    const formattedReason = formatConnectionError(reason, this.config.host, this.config.port);
    this.lastError = formattedReason;
    this.onlineSince = null;
    this.spawnHandled = false;

    const autoReconnect = this.config.autoReconnect !== false;

    if (!this.isManuallyStopped && autoReconnect) {
      if (this.isReconnecting) {
        this.addLog('info', undefined, '[Bot] Reconnect already scheduled, skipping duplicate.');
        return;
      }

      this.isReconnecting = true;
      this.reconnectCount++;

      let delay: number;
      if (this.wasThrottled) {
        this.wasThrottled = false;
        delay = 45000 + Math.floor(Math.random() * 30000); // 45s - 75s for rate limit
        this.addLog('info', undefined, `[Bot] Throttle detected - using cooldown: ${Math.round(delay / 1000)}s`);
      } else {
        const baseDelay = Math.max(2, (this.config.reconnectDelaySeconds || 3)) * 1000;
        const maxDelay = 30000; // Cap at 30 seconds for swift 24/7 reconnection
        const rawDelay = Math.min(baseDelay * Math.pow(1.35, Math.min(this.reconnectCount - 1, 4)), maxDelay);
        const jitter = Math.floor(Math.random() * 1500);
        delay = Math.max(2000, rawDelay + jitter);
      }

      const delaySeconds = Math.max(1, Math.round(delay / 1000));
      this.status = 'reconnecting';
      this.nextReconnectIn = delaySeconds;
      this.addLog('info', undefined, `[Bot] Reconnecting in ${delaySeconds}s (attempt #${this.reconnectCount})`);
      this.emitUpdate();

      this.reconnectCountdownTimer = setInterval(() => {
        if (this.nextReconnectIn && this.nextReconnectIn > 0) {
          this.nextReconnectIn--;
          this.emitUpdate();
        }
      }, 1000);

      this.reconnectTimer = setTimeout(() => {
        if (this.reconnectCountdownTimer) {
          clearInterval(this.reconnectCountdownTimer);
          this.reconnectCountdownTimer = null;
        }
        this.nextReconnectIn = null;
        this.isReconnecting = false;
        this.start();
      }, delay);
    } else {
      this.emitUpdate();
    }
  }

  private startSyncLoop() {
    this.syncPollTimer = setInterval(() => {
      if (this.bot && this.bot.entity) {
        this.position = {
          x: Math.round(this.bot.entity.position.x * 10) / 10,
          y: Math.round(this.bot.entity.position.y * 10) / 10,
          z: Math.round(this.bot.entity.position.z * 10) / 10,
          yaw: this.bot.entity.yaw,
          pitch: this.bot.entity.pitch,
        };
        this.dimension = this.bot.dimension || 'overworld';
        this.gamemode = this.bot.game?.gameMode || 'survival';
        this.ping = this.bot.player?.ping || 0;
        this.inventory = this.bot.inventory?.items()?.map((item: any) => ({
          name: item.name,
          count: item.count,
          displayName: item.displayName,
          slot: item.slot,
        })) || [];
        this.emitUpdate();
      }
    }, 5000);
  }

  private cleanupBot() {
    this.clearAllTimers();
    if (this.bot) {
      try {
        this.bot.removeAllListeners();
        this.bot.quit();
      } catch {}
      this.bot = null;
    }
    this.botStateConnected = false;
  }

  private addInterval(callback: () => void, delay: number) {
    const timer = setInterval(callback, delay);
    this.activeIntervals.push(timer);
    return timer;
  }

  private clearAllIntervals() {
    this.activeIntervals.forEach(clearInterval);
    this.activeIntervals = [];
  }

  private clearBotTimeouts() {
    if (this.connectionTimeoutId) {
      clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.reconnectCountdownTimer) {
      clearInterval(this.reconnectCountdownTimer);
      this.reconnectCountdownTimer = null;
    }
    if (this.leaveRejoinTimer) {
      clearTimeout(this.leaveRejoinTimer);
      this.leaveRejoinTimer = null;
    }
    if (this.joinCommandTimer) {
      clearTimeout(this.joinCommandTimer);
      this.joinCommandTimer = null;
    }
  }

  private clearAllTimers() {
    this.clearBotTimeouts();
    this.clearAllIntervals();
    if (this.syncPollTimer) {
      clearInterval(this.syncPollTimer);
      this.syncPollTimer = null;
    }
  }

  private addLog(type: ChatMessage['type'], sender: string | undefined, text: string, html?: string, isAuto?: boolean) {
    const message: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      type,
      sender,
      text,
      formattedHtml: html,
      isAuto,
    };
    this.chatHistory.push(message);
    if (this.chatHistory.length > 200) this.chatHistory.shift();
    this.emit('chat', message);
  }

  private emitUpdate() {
    this.emit('update', this.getState());
  }

  // Compatibility Stubs for UI controls
  public startAfkLoop() {}
  public stopAfkLoop() {}
  public startViewer() { return null; }
  public stopViewer() {}
  public resetViewerIdleTimeout() {}
  public setUiActive(active: boolean) {}
  public handleControl(command: string, state: boolean) {
    if (this.bot && typeof this.bot.setControlState === 'function') {
      try {
        this.bot.setControlState(command as any, state);
      } catch {}
    }
  }
  public clearChatHistory() {
    this.chatHistory = [];
    this.emitUpdate();
  }

  public async triggerTestMove(): Promise<void> {
    if (!this.bot || !this.botStateConnected) return;

    const antiAfk = this.config.antiAfk || {
      enabled: true,
      intervalSeconds: 20,
      movementType: 'safe_in_place',
      strafeDurationMs: 400,
      swingArm: true,
      sneakWiggle: true,
    };
    const movType = antiAfk.movementType || 'safe_in_place';
    const strafeMs = Math.max(200, antiAfk.strafeDurationMs || 350);

    try {
      if (movType === 'strafe_lr') {
        if (typeof this.bot.setControlState === 'function') {
          this.bot.setControlState('left', true);
          setTimeout(() => {
            if (!this.bot || !this.botStateConnected) return;
            this.bot.setControlState('left', false);
            setTimeout(() => {
              if (!this.bot || !this.botStateConnected) return;
              this.bot.setControlState('right', true);
              setTimeout(() => {
                if (this.bot && typeof this.bot.setControlState === 'function') {
                  this.bot.setControlState('right', false);
                }
              }, strafeMs);
            }, 100);
          }, strafeMs);
        }
      } else if (movType === 'jump_strafe') {
        if (typeof this.bot.setControlState === 'function') {
          this.bot.setControlState('jump', true);
          this.bot.setControlState('left', true);
          setTimeout(() => {
            if (!this.bot || !this.botStateConnected) return;
            this.bot.setControlState('jump', false);
            this.bot.setControlState('left', false);
            setTimeout(() => {
              if (!this.bot || !this.botStateConnected) return;
              this.bot.setControlState('right', true);
              setTimeout(() => {
                if (this.bot && typeof this.bot.setControlState === 'function') {
                  this.bot.setControlState('right', false);
                }
              }, strafeMs);
            }, 100);
          }, strafeMs);
        }
      } else if (movType === 'rotate_look') {
        const yaw = Math.random() * Math.PI * 2 - Math.PI;
        const pitch = Math.random() * Math.PI / 4 - Math.PI / 8;
        this.bot.look(yaw, pitch, false);
      } else if (movType === 'full_routine') {
        const yaw = Math.random() * Math.PI * 2 - Math.PI;
        this.bot.look(yaw, 0, false);
        if (typeof this.bot.setControlState === 'function') {
          this.bot.setControlState('jump', true);
          this.bot.setControlState('left', true);
          setTimeout(() => {
            if (!this.bot || !this.botStateConnected) return;
            this.bot.setControlState('jump', false);
            this.bot.setControlState('left', false);
            setTimeout(() => {
              if (!this.bot || !this.botStateConnected) return;
              this.bot.setControlState('right', true);
              setTimeout(() => {
                if (this.bot && typeof this.bot.setControlState === 'function') {
                  this.bot.setControlState('right', false);
                }
              }, strafeMs);
            }, 100);
          }, strafeMs);
        }
      }

      // Universal actions
      if (typeof this.bot.swingArm === 'function') this.bot.swingArm();
      const slot = Math.floor(Math.random() * 9);
      if (typeof this.bot.setQuickBarSlot === 'function') {
        this.bot.setQuickBarSlot(slot);
        this.quickBarSlot = slot;
      }
      if (typeof this.bot.setControlState === 'function') {
        this.bot.setControlState('sneak', true);
        setTimeout(() => {
          if (this.bot && typeof this.bot.setControlState === 'function') {
            this.bot.setControlState('sneak', false);
          }
        }, 250);
      }

      this.lastActivity = Date.now();
      this.addLog('info', 'AntiAFK', `[AntiAFK] Executed "${movType}" test routine`);
      this.emitUpdate();
    } catch (e: any) {
      this.addLog('error', 'AntiAFK', `[AntiAFK] Test error: ${e.message}`);
    }
  }

  public pruneMemoryUsage() {
    if (this.chatHistory.length > 50) {
      this.chatHistory = this.chatHistory.slice(-50);
    }
  }
}
