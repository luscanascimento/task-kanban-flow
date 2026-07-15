/** Two-letter uppercase initials from a display name, e.g. "Ana Souza" → "AS". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Deterministic HSL colour derived from an arbitrary string. Same input always
 * yields the same hue, so avatars/labels stay stable across renders without a
 * stored colour. Used by the design-system avatar for its fallback background.
 */
export function stringToHslColor(value: string, saturation = 60, lightness = 45): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
