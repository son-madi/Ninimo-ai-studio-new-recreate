/**
 * Smart Minecraft Server Address Sanitizer & Auto-Correction Utility
 * Handles:
 * 1. Splitting host and port (e.g. smppkktr.aternos.me:15087 -> host: smppkktr.aternos.me, port: 15087)
 * 2. Removing protocols (http://, https://, mc://, minecraft://) and trailing slashes
 * 3. Auto-correcting common Minecraft host typos (e.g. atrnos, atrenos, aternos.m, minehut.g)
 * 4. Cleaning accidental spaces or copy-paste artifacts
 */

export interface ParsedServerAddress {
  raw: string;
  host: string;
  port: number | null;
  hasPort: boolean;
  corrections: string[];
}

export function parseAndCleanServerAddress(input: string, currentPort?: number): ParsedServerAddress {
  const corrections: string[] = [];
  let text = (input || '').trim();

  if (!text) {
    return {
      raw: input,
      host: '',
      port: null,
      hasPort: false,
      corrections: [],
    };
  }

  // 1. Remove protocols like http://, https://, minecraft://, mc://
  const protocolRegex = /^(?:https?:\/\/|minecraft:\/\/|mc:\/\/)/i;
  if (protocolRegex.test(text)) {
    text = text.replace(protocolRegex, '');
    corrections.push('Removed URL protocol prefix');
  }

  // 2. Remove trailing slashes or URL paths
  if (text.includes('/')) {
    const parts = text.split('/');
    text = parts[0];
    corrections.push('Removed URL path/slash');
  }

  // 3. Remove all internal whitespace
  if (/\s/.test(text)) {
    text = text.replace(/\s+/g, '');
    corrections.push('Trimmed internal spaces');
  }

  let extractedHost = text;
  let extractedPort: number | null = null;
  let hasPort = false;

  // 4. Handle IPv6 with port [::1]:25565
  const ipv6WithPort = /^\[([0-9a-fA-F:]+)\](?::(\d+))?$/;
  const ipv6Match = text.match(ipv6WithPort);

  if (ipv6Match) {
    extractedHost = ipv6Match[1];
    if (ipv6Match[2]) {
      const p = parseInt(ipv6Match[2], 10);
      if (!isNaN(p) && p >= 1 && p <= 65535) {
        extractedPort = p;
        hasPort = true;
        corrections.push(`Auto-detected port :${p}`);
      }
    }
  } else if (text.includes(':')) {
    // Standard host:port extraction
    const colonIndex = text.lastIndexOf(':');
    const hostPart = text.substring(0, colonIndex);
    const portPart = text.substring(colonIndex + 1);

    const parsedPort = parseInt(portPart, 10);
    if (!isNaN(parsedPort) && parsedPort >= 1 && parsedPort <= 65535) {
      extractedHost = hostPart;
      extractedPort = parsedPort;
      hasPort = true;
      corrections.push(`Auto-detected port :${parsedPort}`);
    }
  }

  // 5. Intelligent Typo Auto-Corrections for popular Minecraft hosts
  let cleanedHost = extractedHost;

  // Aternos typos & missing .me
  // Examples: atrnos, atrenos, aternous, aternosme, aternos.m, aternos.org, aternos.com, smp.aternos
  const aternosTypos = [
    /\.atrnos\.me$/i,
    /\.atrenos\.me$/i,
    /\.aternous\.me$/i,
    /\.aternosme$/i,
    /\.atrnosme$/i,
    /\.aternos\.m$/i,
    /\.aternos\.com$/i,
    /\.aternos\.org$/i,
    /\.atrnos$/i,
    /\.atrenos$/i,
    /\.aternous$/i,
    /\.aternos$/i,
  ];

  for (const pattern of aternosTypos) {
    if (pattern.test(cleanedHost)) {
      const original = cleanedHost;
      cleanedHost = cleanedHost.replace(pattern, '.aternos.me');
      if (original !== cleanedHost) {
        corrections.push(`Corrected to .aternos.me`);
      }
      break;
    }
  }

  // If user just typed "something.aternos" without .me
  if (/^[a-zA-Z0-9_-]+\.aternos$/i.test(cleanedHost)) {
    cleanedHost = `${cleanedHost}.me`;
    corrections.push('Appended missing .me to Aternos host');
  } else if (/^[a-zA-Z0-9_-]+\.atrnos$/i.test(cleanedHost)) {
    cleanedHost = cleanedHost.replace(/\.atrnos$/i, '.aternos.me');
    corrections.push("Corrected 'atrnos' to 'aternos.me'");
  }

  // Minehut typos: .minehut.g, .minehut.com, .minehut -> .minehut.gg
  if (/\.minehut\.(g|com|net|org)$/i.test(cleanedHost)) {
    cleanedHost = cleanedHost.replace(/\.minehut\.(g|com|net|org)$/i, '.minehut.gg');
    corrections.push('Corrected Minehut domain to .minehut.gg');
  } else if (/^[a-zA-Z0-9_-]+\.minehut$/i.test(cleanedHost)) {
    cleanedHost = `${cleanedHost}.gg`;
    corrections.push('Appended .gg to Minehut host');
  }

  // Exaroton typos: .exaroton.m, .exaroton -> .exaroton.me
  if (/\.exaroton\.(m|com|org)$/i.test(cleanedHost)) {
    cleanedHost = cleanedHost.replace(/\.exaroton\.(m|com|org)$/i, '.exaroton.me');
    corrections.push('Corrected Exaroton domain to .exaroton.me');
  } else if (/^[a-zA-Z0-9_-]+\.exaroton$/i.test(cleanedHost)) {
    cleanedHost = `${cleanedHost}.me`;
    corrections.push('Appended .me to Exaroton host');
  }

  // Hypixel typos: hypxiel -> hypixel
  if (/hypxiel/i.test(cleanedHost)) {
    cleanedHost = cleanedHost.replace(/hypxiel/gi, 'hypixel');
    corrections.push("Fixed 'hypxiel' typo to 'hypixel'");
  }

  // Generic TLD typos at the end
  if (cleanedHost.endsWith('.ocm')) {
    cleanedHost = cleanedHost.replace(/\.ocm$/i, '.com');
    corrections.push("Fixed '.ocm' to '.com'");
  } else if (cleanedHost.endsWith('.nte')) {
    cleanedHost = cleanedHost.replace(/\.nte$/i, '.net');
    corrections.push("Fixed '.nte' to '.net'");
  }

  return {
    raw: input,
    host: cleanedHost,
    port: extractedPort !== null ? extractedPort : (currentPort || null),
    hasPort,
    corrections,
  };
}
