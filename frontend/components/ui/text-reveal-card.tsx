'use client';
import { useRef, useState, MouseEvent } from 'react';

interface TextRevealCardProps {
  text: string;
  revealText: string;
  children?: React.ReactNode;
  className?: string;
}

interface TextRevealCardTitleProps   { children: React.ReactNode; className?: string; }
interface TextRevealCardDescProps    { children: React.ReactNode; className?: string; }

export function TextRevealCardTitle({ children, className = '' }: TextRevealCardTitleProps) {
  return (
    <h2 className={`text-white text-lg font-bold mb-2 ${className}`}>{children}</h2>
  );
}

export function TextRevealCardDescription({ children, className = '' }: TextRevealCardDescProps) {
  return (
    <p className={`text-sm text-white/60 ${className}`}>{children}</p>
  );
}

export function TextRevealCard({ text, revealText, children, className = '' }: TextRevealCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mouseX, setMouseX]   = useState(0);
  const [isHovered, setHover] = useState(false);

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMouseX(e.clientX - rect.left);
  };

  const revealWidth  = isHovered ? `${mouseX}px` : '0px';

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`relative rounded-2xl overflow-hidden select-none cursor-default ${className}`}
      style={{
        background: 'rgba(var(--panel-rgb), 0.6)',
        border: '1px solid rgba(var(--brand-rgb), 0.12)',
        padding: '2rem',
      }}
    >
      {/* Header / children */}
      {children && <div className="mb-4">{children}</div>}

      {/* Base text */}
      <div
        className="relative text-2xl font-bold font-display tracking-tight"
        style={{ color: 'rgba(var(--text-rgb),0.25)', letterSpacing: '-0.03em' }}
      >
        {text}
      </div>

      {/* Revealed text (clip mask) */}
      <div
        className="absolute inset-0 flex flex-col justify-end"
        style={{
          clipPath: `inset(0 0 0 0)`,
          WebkitMaskImage: `linear-gradient(to right, black ${revealWidth}, transparent ${revealWidth})`,
          maskImage: `linear-gradient(to right, black ${revealWidth}, transparent ${revealWidth})`,
          transition: isHovered ? 'none' : 'mask-image 0.4s ease',
          padding: '2rem',
          paddingTop: children ? '4.5rem' : '2rem',
        }}
      >
        {children && <div className="mb-4 opacity-0">{children}</div>}
        <div
          className="text-2xl font-bold font-display tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--brand-light) 0%, var(--brand) 50%, var(--sand) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.03em',
          }}
        >
          {revealText}
        </div>
      </div>
    </div>
  );
}
