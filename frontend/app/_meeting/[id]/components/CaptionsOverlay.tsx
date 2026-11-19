import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain } from 'lucide-react';
import { Caption } from './types';

interface CaptionsOverlayProps {
    isCaptionsEnabled: boolean;
    captions: Caption[];
    aiInsights: string[];
    aiMode: 'private' | 'group';
}

const CaptionsOverlay: React.FC<CaptionsOverlayProps> = ({
    isCaptionsEnabled,
    captions,
    aiInsights,
    aiMode
}) => {
    return (
        <AnimatePresence>
            {isCaptionsEnabled && (captions.length > 0 || aiInsights.length > 0) && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-32 left-1/2 -translate-x-1/2 w-full max-w-2xl"
                >
                    <div className="glass-panel p-4 rounded-2xl space-y-2">
                        {captions.slice(-2).map((caption, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <span className="font-bold text-primary">{caption.userName}:</span>
                                <span className="text-white/90">{caption.text}</span>
                                {caption.translatedText && (
                                    <span className="text-xs text-blue-400">({caption.translatedText})</span>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CaptionsOverlay;