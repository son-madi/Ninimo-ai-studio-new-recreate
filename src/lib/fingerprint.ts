// Client-side persistent hardware & device fingerprint generator

export function getDeviceFingerprint(): string {
  try {
    const existing = localStorage.getItem('ninimo_device_fp');
    if (existing && existing.length >= 16) {
      return existing;
    }

    // Combine hardware specs + browser canvas entropy
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const userAgent = navigator.userAgent || 'unknown';
    const lang = navigator.language || 'en';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const cores = navigator.hardwareConcurrency || 4;

    let canvasHash = 0;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 30;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Ninimo Security 2026', 2, 2);
        const dataUrl = canvas.toDataURL();
        for (let i = 0; i < dataUrl.length; i++) {
          canvasHash = (canvasHash << 5) - canvasHash + dataUrl.charCodeAt(i);
          canvasHash |= 0;
        }
      }
    } catch {
      canvasHash = Math.floor(Math.random() * 1000000);
    }

    const raw = `${userAgent}|${screenInfo}|${lang}|${tz}|${cores}|${canvasHash}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }

    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const randomHex = Math.random().toString(36).substring(2, 10);
    const fingerprint = `dev_${hex}_${randomHex}`;

    localStorage.setItem('ninimo_device_fp', fingerprint);
    document.cookie = `ninimo_device_id=${encodeURIComponent(fingerprint)}; path=/; max-age=31536000; SameSite=Lax`;
    return fingerprint;
  } catch {
    const fallback = `dev_fallback_${Date.now()}`;
    return fallback;
  }
}
