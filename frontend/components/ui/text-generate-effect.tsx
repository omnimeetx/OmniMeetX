'use client';
import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

interface TextGenerateEffectProps {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
}

/**
 * Aceternity TextGenerateEffect — animates each word in from opacity:0
 * with optional blur filter, triggered by IntersectionObserver.
 */
export function TextGenerateEffect({
  words,
  className = '',
  filter = true,
  duration = 0.5,
}: TextGenerateEffectProps) {
  const ref     = useRef<HTMLParagraphElement>(null);
  const [inView, setInView] = useState(false);
  const wordList = words.split(' ');

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={className}>
      <p ref={ref} className="leading-snug tracking-wide">
        {wordList.map((word, idx) => (
          <motion.span
            key={idx}
            initial={{ opacity: 0, filter: filter ? 'blur(10px)' : 'none' }}
            animate={inView ? { opacity: 1, filter: 'blur(0px)' } : {}}
            transition={{ duration, delay: idx * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ display: 'inline-block', marginRight: '0.28em', willChange: 'opacity, filter' }}
          >
            {word}
          </motion.span>
        ))}
      </p>
    </div>
  );
}
