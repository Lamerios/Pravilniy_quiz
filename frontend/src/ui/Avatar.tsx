import React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name?: string;
  size?: number; // px
  rounded?: number; // radius in px
}

function getInitials(name?: string): string {
  if (!name) return 'A';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 40, rounded = 10, style, className, ...rest }) => {
  const initials = getInitials(name);
  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: rounded,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, var(--primary-400), var(--primary-500))',
    color: 'white',
    fontWeight: 600,
    boxShadow: 'var(--shadow-md)'
  };

  return (
    <div className={[className || ''].filter(Boolean).join(' ')} style={{ ...baseStyle, ...style }} {...rest}>
      {src ? (
        <img src={src} alt={name || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: rounded }} />
      ) : (
        <span style={{ fontSize: Math.max(12, Math.floor(size / 3)) }}>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;
