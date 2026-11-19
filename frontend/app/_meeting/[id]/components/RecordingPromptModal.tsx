'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Mic, Sparkles, Shield, X } from 'lucide-react';

interface RecordingPromptModalProps {
    isOpen: boolean;
    onStartRecording: () => void;
    onCancel: () => void;
}

const RecordingPromptModal: React.FC<RecordingPromptModalProps> = ({
    isOpen,
    onStartRecording,
    onCancel,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 flex items-center justify-center z-[100]"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onCancel}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md mx-4 rounded-3xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(145deg, rgba(15,15,25,0.98), rgba(25,20,40,0.98))',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(var(--sand-rgb),0.15)',
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all z-10"
                        >
                            <X size={16} />
                        </button>

                        {/* Gradient accent bar */}
                        <div className="h-1 w-full tile-accent" />

                        <div className="p-8">
                            {/* Icon */}
                            <div className="flex justify-center mb-6">
                                <motion.div
                                    animate={{
                                        boxShadow: [
                                            '0 0 20px rgba(var(--sand-rgb),0.3)',
                                            '0 0 40px rgba(var(--sand-rgb),0.5)',
                                            '0 0 20px rgba(var(--sand-rgb),0.3)',
                                        ],
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-violet-400/30 flex items-center justify-center"
                                >
                                    <Monitor size={28} className="text-violet-300" />
                                </motion.div>
                            </div>

                            {/* Title */}
                            <h2 className="text-2xl font-bold text-center text-white mb-2">
                                Start HD Recording
                            </h2>
                            <p className="text-sm text-white/50 text-center mb-8">
                                Share your screen to capture your meeting in high quality
                            </p>

                            {/* Feature list */}
                            <div className="space-y-3 mb-8">
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                                        <Monitor size={16} className="text-violet-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white/90">HD Screen Capture</p>
                                        <p className="text-xs text-white/40">Records everything on your shared screen</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <div className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center flex-shrink-0">
                                        <Mic size={16} className="text-pink-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white/90">Audio Included</p>
                                        <p className="text-xs text-white/40">Your microphone and screen audio are captured</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                                        <Sparkles size={16} className="text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white/90">AI Meeting Notes</p>
                                        <p className="text-xs text-white/40">Automatic transcription & summary after meeting</p>
                                    </div>
                                </div>
                            </div>

                            {/* Info badge & Tip */}
                            <div className="flex flex-col gap-2 mb-6">
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-400/20">
                                    <Shield size={14} className="text-violet-400 flex-shrink-0" />
                                    <p className="text-xs text-violet-300/80">
                                        Your browser will ask you to select a screen or tab to share
                                    </p>
                                </div>
                                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-400/20">
                                    <p className="text-xs text-blue-300/90 leading-relaxed">
                                        <span className="font-semibold text-blue-300">Tip:</span> Select a <strong>Tab</strong> for best quality — make sure to check <strong>&quot;Share tab audio&quot;</strong>.
                                    </p>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-line text-white/70 hover:text-white text-sm font-medium transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onStartRecording}
                                    className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--sand), var(--sand), var(--warn))',
                                        boxShadow: '0 4px 20px rgba(var(--sand-rgb),0.4)',
                                    }}
                                >
                                    🎬 Start Recording
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default RecordingPromptModal;
