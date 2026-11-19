import React from 'react';
import { motion } from 'framer-motion';
import { FloatingEmoji } from './types';

interface FloatingEmojisProps {
    floatingEmojis: FloatingEmoji[];
}

const FloatingEmojis: React.FC<FloatingEmojisProps> = ({ floatingEmojis }) => {
    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {floatingEmojis.map((floating) => (
                <motion.div
                    key={floating.id}
                    className="absolute text-3xl md:text-4xl pointer-events-none"
                    style={{
                        left: `${floating.x}%`,
                        bottom: `${floating.y}%`,
                    }}
                    initial={{
                        y: 0,
                        opacity: 1,
                        scale: 0.5,
                    }}
                    animate={{
                        y: -200,
                        opacity: 0,
                        scale: 1.2,
                    }}
                    transition={{
                        duration: 3,
                        ease: "easeOut",
                    }}
                >
                    {floating.emoji}
                </motion.div>
            ))}
        </div>
    );
};

export default FloatingEmojis;