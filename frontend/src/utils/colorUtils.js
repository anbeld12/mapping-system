/**
 * Generates a consistent HSL color from any string (e.g., a UUID or numeric ID).
 * Uses a simple hash to distribute colors evenly around the hue wheel.
 *
 * @param {string|number} str - The identifier to convert to a color.
 * @returns {string} A CSS HSL color string.
 */
export function stringToColor(str) {
  if (!str) return '#3388ff';
  const s = String(str);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 50%)`;
}
