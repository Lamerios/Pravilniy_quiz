import React, { useState, useEffect } from 'react';

export interface AwardProps {
  icon: string; // emoji or single-char icon
  title: string;
  subtitle?: string;
  gradient?: string; // css gradient
  tooltip?: string;
}

export const Award: React.FC<AwardProps> = ({ icon, title, subtitle, gradient, tooltip }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const bg = gradient || 'linear-gradient(135deg, #7c3aed, #8b5cf6)';
  return (
    <div className="card" style={{ minWidth: isMobile ? '100%' : 180, flex: isMobile ? '1 1 100%' : undefined }} title={tooltip}>
      <div className="card-body" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: isMobile ? 10 : 12,
        padding: isMobile ? '10px' : undefined
      }}>
        <div style={{ 
          width: isMobile ? 40 : 48, 
          height: isMobile ? 40 : 48, 
          borderRadius: 12, 
          background: bg, 
          color: 'white', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontSize: isMobile ? 20 : 24, 
          boxShadow: 'var(--shadow-md)',
          flexShrink: 0
        }}>
          <span aria-hidden>{icon}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: isMobile ? '0.9em' : undefined, wordBreak: 'break-word' }}>{title}</div>
          {subtitle ? <div className="muted" style={{ fontSize: isMobile ? 11 : 12 }}>{subtitle}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default Award;


