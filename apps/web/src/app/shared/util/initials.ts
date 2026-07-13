/** Two-letter uppercase initials from a display name, e.g. "Ana Souza" → "AS". */
export function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
