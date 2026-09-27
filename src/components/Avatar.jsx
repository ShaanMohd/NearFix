import React, { useState } from 'react';
import { resolveAvatarUrl, generateInitialsAvatar } from '../utils/avatar';

/**
 * Universal Avatar component:
 * 1. Automatically resolves relative paths (e.g., /uploads/avatars/...) to backend host.
 * 2. If photo is missing or fails to load, gracefully falls back to a crisp, colorful initials thumbnail.
 * 3. Never displays broken image icons.
 */
export default function Avatar({
  src,
  name = 'User',
  size = 48,
  alt,
  className = '',
  style = {},
  onClick
}) {
  const [hasError, setHasError] = useState(false);

  // If there was a loading error or no valid src was provided, render dynamic initials thumbnail
  const isSrcEmpty = !src || (typeof src === 'string' && src.trim() === '');
  const imageSrc = hasError || isSrcEmpty
    ? generateInitialsAvatar(name, typeof size === 'number' ? size : 80)
    : resolveAvatarUrl(src, name);

  return (
    <img
      src={imageSrc}
      alt={alt || name}
      onError={() => setHasError(true)}
      onClick={onClick}
      className={className}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        ...style
      }}
    />
  );
}
