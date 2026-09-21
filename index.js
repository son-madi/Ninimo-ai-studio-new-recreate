#!/usr/bin/env node
/**
 * ⚡ Ninimo Bot 24/7 Universal Launcher
 * Designed for 1-Click Startup on Local PC (Windows/Linux/macOS), VPS, or Railway.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

console.log('\n' + '='.repeat(60));
console.log(`🤖 Starting Ninimo 24/7 Minecraft Bot Server [${isDev ? 'Development' : 'Production'}]...`);
console.log('='.repeat(60));

// Step 1: Ensure persistent data directory exists
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch {}
}

// Step 2: Ensure node_modules exists
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('📦 [Auto-Setup] node_modules not found. Installing dependencies...');
  try {
    execSync('npm install --legacy-peer-deps', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ [Auto-Setup] Dependencies installed successfully!');
  } catch (err) {
    console.error('⚠️ [Auto-Setup] Failed to install dependencies via npm:', err?.message || err);
  }
}

// Step 3: In production mode, ensure dist/server.cjs and dist/index.html exist
const serverBundlePath = path.join(__dirname, 'dist', 'server.cjs');
const clientBundlePath = path.join(__dirname, 'dist', 'index.html');

if (!isDev && (!fs.existsSync(serverBundlePath) || !fs.existsSync(clientBundlePath))) {
  console.log('⚡ [Auto-Build] Production build not found. Compiling dashboard and server...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ [Auto-Build] Build finished successfully!');
  } catch (err) {
    console.error('⚠️ [Auto-Build Error]:', err?.message || err);
  }
}

// Step 4: Run the server
try {
  console.log('Step 4: Checking environment...');
  console.log('isDev:', isDev);
  console.log('serverBundlePath exists:', fs.existsSync(serverBundlePath));
  console.log('clientBundlePath exists:', fs.existsSync(clientBundlePath));
  console.log('PORT env:', process.env.PORT);

  if (!isDev && fs.existsSync(serverBundlePath)) {
    // Run production CommonJS bundled server
    console.log('🚀 Running production server (CommonJS bundle) via import...');
    try {
      // Using absolute file URL for dynamic import
      const { pathToFileURL } = await import('url');
      const serverModule = await import(pathToFileURL(serverBundlePath).href);
      console.log('✅ Server module imported successfully.');
    } catch (importErr) {
      console.error('❌ Failed to load dist/server.cjs via import. Attempting fallback...', importErr);
      console.log('🚀 Falling back to npx tsx server.ts...');
      execSync('npx tsx server.ts', { stdio: 'inherit', cwd: __dirname });
    }
  } else {
    console.log('🚀 Running server with live TypeScript compilation (tsx)...');
    execSync('npx tsx server.ts', { stdio: 'inherit', cwd: __dirname });
  }
} catch (err) {
  console.error('❌ Fatal launch error:', err);
  process.exit(1);
}
