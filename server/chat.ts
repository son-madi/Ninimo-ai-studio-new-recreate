import { DATA_DIR, NINIMO_STORAGE_DIR, safeReadJson, safeWriteJson } from './dataDir.js';
import { saveGeneralChatToRedis, fetchGeneralChatFromRedis } from './upstashStorage.js';

export interface ReplyPreview {
  id: string;
  senderName: string;
  text?: string;
  hasImage?: boolean;
}

export interface GeneralChatMessage {
  id: string;
  userId: string;
  username: string;
  photoURL?: string;
  isAdmin?: boolean;
  isDev?: boolean;
  text?: string;
  imageUrl?: string;
  replyTo?: ReplyPreview;
  createdAt: number;
}

export interface ChatConfig {
  allowImageUploads: boolean;
}

const CHAT_FILE = 'general_chat.json';
const CHAT_CONFIG_FILE = 'chat_config.json';

export class ChatManager {
  private messages: GeneralChatMessage[] = [];
  private config: ChatConfig = { allowImageUploads: true };
  private maxMessages = 1000;

  constructor() {
    this.loadMessages();
    this.loadConfig();
  }

  public async init(): Promise<void> {
    this.loadMessages();
    this.loadConfig();
    try {
      const cloudMsgs = await fetchGeneralChatFromRedis();
      if (cloudMsgs && Array.isArray(cloudMsgs) && cloudMsgs.length > 0) {
        if (this.messages.length === 0 || cloudMsgs.length >= this.messages.length) {
          this.messages = cloudMsgs;
          this.saveMessages();
        }
      }
    } catch (err) {
      console.warn('[ChatManager] Cloud chat hydration error:', err);
    }
  }

  private loadConfig() {
    const data = safeReadJson<any>(CHAT_CONFIG_FILE, null);
    if (data && typeof data === 'object') {
      this.config = { ...this.config, ...data };
    }
  }

  private saveConfig() {
    try {
      safeWriteJson(CHAT_CONFIG_FILE, this.config);
    } catch (err) {
      console.error('Failed to save chat config:', err);
    }
  }

  private loadMessages() {
    const list = safeReadJson<GeneralChatMessage[]>(CHAT_FILE, []);
    if (Array.isArray(list) && list.length > 0) {
      this.messages = list;
    }
  }

  private saveMessages() {
    try {
      safeWriteJson(CHAT_FILE, this.messages);
    } catch (err) {
      console.error('Failed to save general chat messages to disk:', err);
    }

    // Persist to Upstash Redis Cloud Storage
    saveGeneralChatToRedis(this.messages).catch((err) => {
      console.error('[Upstash Redis] Background chat save error:', err);
    });
  }

  public getConfig(): ChatConfig {
    return { ...this.config };
  }

  public setAllowImageUploads(allow: boolean): ChatConfig {
    this.config.allowImageUploads = !!allow;
    this.saveConfig();
    return this.getConfig();
  }

  public getMessages(limit = 150): GeneralChatMessage[] {
    if (this.messages.length <= limit) {
      return [...this.messages];
    }
    return this.messages.slice(this.messages.length - limit);
  }

  public addMessage(
    user: { id: string; username: string; photoURL?: string; isAdmin?: boolean },
    payload: { text?: string; imageUrl?: string; replyTo?: ReplyPreview }
  ): GeneralChatMessage {
    const text = (payload.text || '').trim();
    const imageUrl = payload.imageUrl ? payload.imageUrl.trim() : undefined;

    if (!text && !imageUrl) {
      throw new Error('Message must have either text content or an image');
    }

    if (imageUrl && !this.config.allowImageUploads && !user.isAdmin) {
      throw new Error('Image sending is currently disabled by administrators');
    }

    // Dev badge: if admin, mark isDev = true
    const isDev = !!user.isAdmin || user.username.toLowerCase() === 'shifin';

    const msg: GeneralChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      userId: user.id,
      username: user.username,
      photoURL: user.photoURL,
      isAdmin: !!user.isAdmin,
      isDev,
      text: text ? text.substring(0, 2000) : undefined,
      imageUrl,
      replyTo: payload.replyTo ? {
        id: payload.replyTo.id,
        senderName: payload.replyTo.senderName,
        text: payload.replyTo.text ? payload.replyTo.text.substring(0, 120) : undefined,
        hasImage: !!payload.replyTo.hasImage,
      } : undefined,
      createdAt: Date.now(),
    };

    this.messages.push(msg);

    // Keep within reasonable bounds
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(this.messages.length - this.maxMessages);
    }

    this.saveMessages();
    return msg;
  }

  public deleteMessage(messageId: string, requestingUser: { id: string; isAdmin?: boolean }): boolean {
    const idx = this.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return false;

    const msg = this.messages[idx];
    if (!requestingUser.isAdmin && msg.userId !== requestingUser.id) {
      throw new Error('You do not have permission to delete this message');
    }

    this.messages.splice(idx, 1);
    this.saveMessages();
    return true;
  }

  public clearAllMessages(): void {
    this.messages = [];
    this.saveMessages();
  }

  public mergeMessages(incoming: GeneralChatMessage[]): GeneralChatMessage[] {
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return this.getMessages();
    }
    const existingMap = new Map<string, GeneralChatMessage>();
    for (const msg of this.messages) {
      if (msg && msg.id) existingMap.set(msg.id, msg);
    }
    for (const msg of incoming) {
      if (msg && msg.id && (msg.text || msg.imageUrl) && !existingMap.has(msg.id)) {
        existingMap.set(msg.id, {
          id: String(msg.id),
          userId: String(msg.userId || 'anonymous'),
          username: String(msg.username || 'User').slice(0, 64),
          photoURL: msg.photoURL ? String(msg.photoURL).slice(0, 500) : undefined,
          isAdmin: Boolean(msg.isAdmin),
          isDev: Boolean(msg.isDev),
          text: msg.text ? String(msg.text).slice(0, 2000) : undefined,
          imageUrl: msg.imageUrl ? String(msg.imageUrl).slice(0, 10000) : undefined,
          replyTo: msg.replyTo ? {
            id: String(msg.replyTo.id || ''),
            senderName: String(msg.replyTo.senderName || ''),
            text: msg.replyTo.text ? String(msg.replyTo.text).slice(0, 120) : undefined,
            hasImage: Boolean(msg.replyTo.hasImage),
          } : undefined,
          createdAt: Number(msg.createdAt) || Date.now(),
        });
      }
    }
    this.messages = Array.from(existingMap.values()).sort((a, b) => a.createdAt - b.createdAt);
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(this.messages.length - this.maxMessages);
    }
    this.saveMessages();
    return this.getMessages();
  }

  public shutdown(): void {
    try {
      this.saveMessages();
      this.saveConfig();
    } catch (err) {
      console.error('Error saving chat data on shutdown:', err);
    }
  }
}
