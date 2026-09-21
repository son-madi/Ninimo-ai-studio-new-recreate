// Utility to parse Minecraft formatting codes (§ and &) and JSON chat to clean HTML

const MC_COLORS: Record<string, string> = {
  '0': '#000000', // Black
  '1': '#0000AA', // Dark Blue
  '2': '#00AA00', // Dark Green
  '3': '#00AAAA', // Dark Aqua
  '4': '#AA0000', // Dark Red
  '5': '#AA00AA', // Dark Purple
  '6': '#FFAA00', // Gold
  '7': '#AAAAAA', // Gray
  '8': '#555555', // Dark Gray
  '9': '#5555FF', // Blue
  'a': '#55FF55', // Green
  'b': '#55FFFF', // Aqua
  'c': '#FF5555', // Red
  'd': '#FF55FF', // Light Purple
  'e': '#FFFF55', // Yellow
  'f': '#FFFFFF', // White
};

const MC_FORMATS: Record<string, string> = {
  'k': 'obfuscated',
  'l': 'font-bold',
  'm': 'line-through',
  'u': 'underline',
  'o': 'italic',
  'r': 'reset',
};

export function minecraftFormatToHtml(text: string): string {
  if (!text) return '';

  // Escape HTML characters first
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Handle § formatting codes
  const regex = /§([0-9a-fk-or])/gi;
  let currentColor: string | null = null;
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrikethrough = false;

  let result = '';
  let lastIndex = 0;
  let openSpan = false;

  const closeCurrent = () => {
    if (openSpan) {
      result += '</span>';
      openSpan = false;
    }
  };

  const openNew = () => {
    closeCurrent();
    const styles: string[] = [];
    if (currentColor) styles.push(`color: ${currentColor}`);
    if (isBold) styles.push('font-weight: bold');
    if (isItalic) styles.push('font-style: italic');
    if (isUnderline) styles.push('text-decoration: underline');
    if (isStrikethrough) styles.push('text-decoration: line-through');

    if (styles.length > 0) {
      result += `<span style="${styles.join('; ')}">`;
      openSpan = true;
    }
  };

  let match;
  while ((match = regex.exec(escaped)) !== null) {
    const textChunk = escaped.substring(lastIndex, match.index);
    result += textChunk;

    const code = match[1].toLowerCase();
    if (MC_COLORS[code]) {
      currentColor = MC_COLORS[code];
      openNew();
    } else if (code === 'r') {
      currentColor = null;
      isBold = false;
      isItalic = false;
      isUnderline = false;
      isStrikethrough = false;
      closeCurrent();
    } else if (code === 'l') {
      isBold = true;
      openNew();
    } else if (code === 'o') {
      isItalic = true;
      openNew();
    } else if (code === 'u') {
      isUnderline = true;
      openNew();
    } else if (code === 'm') {
      isStrikethrough = true;
      openNew();
    }

    lastIndex = regex.lastIndex;
  }

  result += escaped.substring(lastIndex);
  closeCurrent();

  return result;
}

export function stripMinecraftCodes(text: string): string {
  if (!text) return '';
  return text.replace(/§[0-9a-fk-or]/gi, '');
}
