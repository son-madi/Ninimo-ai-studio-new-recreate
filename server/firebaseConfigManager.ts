import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './dataDir.js';

export interface FirebaseAppConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
  projectName?: string;
}

const CUSTOM_CONFIG_PATH = path.join(DATA_DIR, 'firebase-custom-config.json');
const DEFAULT_CONFIG_PATH = path.join(process.cwd(), 'firebase-applet-config.json');

class FirebaseConfigManager {
  private defaultConfig: FirebaseAppConfig = {
    apiKey: '',
    authDomain: '',
    projectId: '',
  };

  constructor() {
    this.loadDefaultConfig();
  }

  private loadDefaultConfig() {
    try {
      if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
        const raw = fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf-8');
        this.defaultConfig = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[FirebaseConfigManager] Could not read default firebase-applet-config.json:', err);
    }
  }

  public getActiveConfig(): { config: FirebaseAppConfig; isCustom: boolean } {
    try {
      if (fs.existsSync(CUSTOM_CONFIG_PATH)) {
        const raw = fs.readFileSync(CUSTOM_CONFIG_PATH, 'utf-8');
        const custom = JSON.parse(raw);
        if (custom && custom.apiKey && custom.authDomain && custom.projectId) {
          return { config: custom, isCustom: true };
        }
      }
    } catch (err) {
      console.warn('[FirebaseConfigManager] Failed reading custom config:', err);
    }

    // Check environment variables as fallback
    const envApiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
    const envAuthDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN;
    const envProjectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

    if (envApiKey && envAuthDomain && envProjectId) {
      return {
        config: {
          apiKey: envApiKey,
          authDomain: envAuthDomain,
          projectId: envProjectId,
          appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || this.defaultConfig.appId,
          storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || this.defaultConfig.storageBucket,
          messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || this.defaultConfig.messagingSenderId,
          firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || this.defaultConfig.firestoreDatabaseId,
        },
        isCustom: true,
      };
    }

    return {
      config: { ...this.defaultConfig },
      isCustom: false,
    };
  }

  public setCustomConfig(incoming: any): { success: boolean; config: FirebaseAppConfig } {
    if (!incoming || typeof incoming !== 'object') {
      throw new Error('Config payload must be a JSON object');
    }

    const apiKey = String(incoming.apiKey || '').trim();
    const authDomain = String(incoming.authDomain || '').trim();
    const projectId = String(incoming.projectId || '').trim();
    const appId = String(incoming.appId || '').trim();
    const storageBucket = String(incoming.storageBucket || '').trim();
    const messagingSenderId = String(incoming.messagingSenderId || '').trim();
    const firestoreDatabaseId = String(incoming.firestoreDatabaseId || '').trim();
    const projectName = String(incoming.projectName || incoming.projectId || '').trim();

    if (!apiKey) throw new Error('Firebase apiKey is required');
    if (!authDomain) throw new Error('Firebase authDomain is required');
    if (!projectId) throw new Error('Firebase projectId is required');

    const cleanConfig: FirebaseAppConfig = {
      apiKey,
      authDomain,
      projectId,
      appId: appId || undefined,
      storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
      messagingSenderId: messagingSenderId || undefined,
      firestoreDatabaseId: firestoreDatabaseId || undefined,
      projectName: projectName || projectId,
    };

    fs.writeFileSync(CUSTOM_CONFIG_PATH, JSON.stringify(cleanConfig, null, 2), 'utf-8');
    console.log(`[FirebaseConfigManager] Saved custom Firebase project: "${cleanConfig.projectId}" (${cleanConfig.authDomain})`);

    return { success: true, config: cleanConfig };
  }

  public resetToDefault(): { success: boolean; config: FirebaseAppConfig } {
    if (fs.existsSync(CUSTOM_CONFIG_PATH)) {
      try {
        fs.unlinkSync(CUSTOM_CONFIG_PATH);
        console.log('[FirebaseConfigManager] Reset Firebase configuration to system default');
      } catch (err) {
        console.warn('[FirebaseConfigManager] Error removing custom config file:', err);
      }
    }
    return { success: true, config: { ...this.defaultConfig } };
  }
}

export const firebaseConfigManager = new FirebaseConfigManager();
