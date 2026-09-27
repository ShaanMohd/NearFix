// Deterministic color palette for initial-based avatar thumbnails
const PALETTES = [
  { bg: '#4f46e5', text: '#ffffff' }, // Indigo
  { bg: '#0284c7', text: '#ffffff' }, // Sky
  { bg: '#0d9488', text: '#ffffff' }, // Teal
  { bg: '#16a34a', text: '#ffffff' }, // Emerald
  { bg: '#d97706', text: '#ffffff' }, // Amber
  { bg: '#e11d48', text: '#ffffff' }, // Rose
  { bg: '#7c3aed', text: '#ffffff' }, // Violet
  { bg: '#db2777', text: '#ffffff' }, // Pink
  { bg: '#2563eb', text: '#ffffff' }, // Royal Blue
  { bg: '#0891b2', text: '#ffffff' }, // Cyan
];

/**
 * Generate a dynamic, crisp SVG avatar data-URI with user initials.
 * 100% offline, zero latency, no external network requests needed.
 */
export function generateInitialsAvatar(name = 'User', size = 120) {
  const cleanName = (name || 'User').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  let initials = 'U';
  if (parts.length === 1) {
    initials = parts[0].slice(0, 2).toUpperCase();
  } else if (parts.length > 1) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % PALETTES.length;
  const { bg, text } = PALETTES[colorIndex];

  const fontSize = Math.round(size * 0.42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${bg}"/>
    <text x="50%" y="54%" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" font-weight="700" fill="${text}" dominant-baseline="middle" text-anchor="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Resolves avatar source to full backend static URL if relative path.
 * If empty or invalid, falls back to dynamic initials avatar thumbnail.
 */
export const resolveAvatarUrl = (avatar, fallbackName = 'User') => {
  if (!avatar || typeof avatar !== 'string' || avatar.trim() === '') {
    return generateInitialsAvatar(fallbackName);
  }
  const trimmed = avatar.trim();
  if (
    trimmed.startsWith('http://') || 
    trimmed.startsWith('https://') || 
    trimmed.startsWith('data:') || 
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `http://localhost:5000${cleanPath}`;
};
