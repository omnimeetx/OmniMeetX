'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RecordingConsentPopupProps {
  isOpen: boolean;
  onStartRecording: () => void; // HD: triggers getDisplayMedia (user informed)
  onDecline: () => void;        // Silent: server-side mic-only streaming
}

const RecordingConsentPopup: React.FC<RecordingConsentPopupProps> = ({
  isOpen,
  onStartRecording,
  onDecline,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="relative w-full max-w-md bg-panel border border-line rounded-2xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            >
              {/* Gradient top bar */}
              <div className="h-1 w-full tile-accent" />

              <div className="p-6">
                {/* Icon */}
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-violet-500/15 border border-violet-500/30 mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-7 h-7 text-violet-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="8" y1="22" x2="16" y2="22" />
                  </svg>
                </div>

                {/* Title */}
                <h2 className="text-xl font-semibold text-white text-center mb-2">
                  Generate AI meeting notes?
                </h2>

                {/* Body */}
                <p className="text-sm text-slate-400 text-center mb-5 leading-relaxed">
                  Your audio is already being recorded server-side for{' '}
                  <span className="text-slate-200 font-medium">transcription & AI notes</span>.
                  For an HD video recording of your screen too, choose below.
                </p>

                {/* Compare options */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {/* HD option */}
                  <div className="rounded-xl bg-violet-500/10 border border-violet-500/25 p-3">
                    <div className="text-violet-300 text-sm font-semibold mb-1">🖥️ HD Recording</div>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• Screen + audio</li>
                      <li>• Full video replay</li>
                      <li>• One-click share</li>
                    </ul>
                  </div>
                  {/* Audio only */}
                  <div className="rounded-xl bg-white/5 border border-line p-3">
                    <div className="text-slate-300 text-sm font-semibold mb-1">🎙️ Audio Only</div>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• Mic already active</li>
                      <li>• AI notes still generated</li>
                      <li>• No extra steps</li>
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  {/* Primary — HD Recording */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onStartRecording}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white tile-accent hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/40 transition-all duration-150"
                  >
                    🖥️ Enable HD Recording
                  </motion.button>

                  {/* Secondary — Audio only, no prompt */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={onDecline}
                    className="w-full py-2.5 rounded-xl font-medium text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 transition-all duration-150"
                  >
                    No thanks, audio only
                  </motion.button>
                </div>

                {/* Footer note */}
                <p className="text-xs text-slate-600 text-center mt-4">
                  HD recording requires selecting your screen once. Audio notes are always generated automatically.
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RecordingConsentPopup;