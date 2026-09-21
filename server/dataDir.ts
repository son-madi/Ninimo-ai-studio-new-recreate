import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();

// Dedicated, protected folder strictly for user configurations, accounts, sessions & bots
export const NINIMO_STORAGE_DIR = path.resolve(ROOT_DIR, 'ninimo_storage');
export const BACKUP_DIR = path.resolve(NINIMO_STORAGE_DIR, 'backups');
export const DATA_DIR = path.resolve(ROOT_DIR, 'data');

/**
 * Initializes and guarantees directory existence for all storage tiers
 */
export function initStorageDirectories(): void {
  const dirs = [NINIMO_STORAGE_DIR, BACKUP_DIR, DATA_DIR];
  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      try {
        fs.mkdirSync(d, { recursive: true });
      } catch (err) {
        console.error(`[Storage Init] Error creating directory ${d}:`, err);
      }
    }
  }

  // Cross-pollinate and seed between data/ and ninimo_storage/ so no legacy data is lost
  const seedFiles = [
    'users.json',
    'bot-configs.json',
    'sessions.json',
    'quick-tokens.json',
    'system-settings.json',
    'user-defaults.json',
    'general_chat.json',
    'chat_config.json',
  ];

  for (const file of seedFiles) {
    const dataSrc = path.join(DATA_DIR, file);
    const storageDst = path.join(NINIMO_STORAGE_DIR, file);

    // If file exists in data/ but not in ninimo_storage/, copy it
    if (fs.existsSync(dataSrc) && !fs.existsSync(storageDst)) {
      try {
        fs.copyFileSync(dataSrc, storageDst);
        console.log(`[Storage Init] Migrated ${file} -> ninimo_storage/`);
      } catch {}
    }

    // If file exists in ninimo_storage/ but not in data/, mirror it
    if (fs.existsSync(storageDst) && !fs.existsSync(dataSrc)) {
      try {
        fs.copyFileSync(storageDst, dataSrc);
      } catch {}
    }
  }
}

// Auto-run on module load
initStorageDirectories();

/**
 * Safe JSON file reader with hierarchical multi-tier fallbacks:
 * 1. ninimo_storage/<filename>
 * 2. ninimo_storage/backups/<filename>.backup
 * 3. data/<filename>
 * 4. data/<filename>.backup
 * 5. <filename> in root
 */
export function safeReadJson<T>(filename: string, fallback: T): T {
  const candidatePaths = [
    path.join(NINIMO_STORAGE_DIR, filename),
    path.join(BACKUP_DIR, `${filename}.backup`),
    path.join(DATA_DIR, filename),
    path.join(DATA_DIR, `${filename}.backup`),
    path.join(ROOT_DIR, filename),
  ];

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (!raw || raw.trim().length === 0) continue;
        const parsed = JSON.parse(raw);
        if (parsed !== undefined && parsed !== null) {
          // If expecting an array and received an array with items, or object
          if (Array.isArray(fallback)) {
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed as T;
            }
          } else if (typeof fallback === 'object') {
            if (typeof parsed === 'object' && Object.keys(parsed).length > 0) {
              return parsed as T;
            }
          } else {
            return parsed as T;
          }
        }
      } catch (err) {
        console.warn(`[Safe Storage] Warning reading ${filePath}:`, err);
      }
    }
  }

  return fallback;
}

/**
 * Safe JSON file writer with atomic swap, multi-tier mirroring & backup preservation:
 * - Writes atomically to .tmp then renames to target
 * - Updates ninimo_storage/<filename>
 * - Updates ninimo_storage/backups/<filename>.backup
 * - Updates data/<filename>
 * - Prevents wiping non-empty files with empty payloads
 */
export function safeWriteJson(filename: string, data: any, allowEmptyWipe: boolean = false): void {
  try {
    // Guard against accidental blank wipes
    if (!allowEmptyWipe) {
      if (Array.isArray(data) && data.length === 0) {
        const existing = safeReadJson<any[]>(filename, []);
        if (existing.length > 0) {
          console.warn(`[Safe Storage Guard] Prevented blank wipe of ${filename} (existing: ${existing.length} items).`);
          return;
        }
      }
    }

    const payload = JSON.stringify(data, null, 2);

    // 1. Primary write to ninimo_storage
    const primaryPath = path.join(NINIMO_STORAGE_DIR, filename);
    const tmpPrimary = `${primaryPath}.tmp`;
    fs.writeFileSync(tmpPrimary, payload, 'utf-8');
    fs.renameSync(tmpPrimary, primaryPath);

    // 2. Backup write to ninimo_storage/backups
    try {
      const backupPath = path.join(BACKUP_DIR, `${filename}.backup`);
      fs.writeFileSync(backupPath, payload, 'utf-8');
    } catch {}

    // 3. Mirror write to data/
    try {
      const mirrorPath = path.join(DATA_DIR, filename);
      const tmpMirror = `${mirrorPath}.tmp`;
      fs.writeFileSync(tmpMirror, payload, 'utf-8');
      fs.renameSync(tmpMirror, mirrorPath);
    } catch {}
  } catch (err) {
    console.error(`[Safe Storage] Failed to write ${filename}:`, err);
  }
}
