export const resolveAvatarUrl = (avatar, fallbackName = 'User') => {
  if (!avatar) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=4f46e5&color=fff`;
  }
  if (
    avatar.startsWith('http://') || 
    avatar.startsWith('https://') || 
    avatar.startsWith('data:') || 
    avatar.startsWith('blob:')
  ) {
    return avatar;
  }
  const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
  return `http://localhost:5000${cleanPath}`;
};
