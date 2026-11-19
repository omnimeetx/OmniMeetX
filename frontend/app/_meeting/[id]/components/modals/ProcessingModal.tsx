import { API_URL } from "@/lib/config"
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProcessingModalProps {
    isOpen: boolean;
    onClose: () => void;
    meetingId: string;
    onComplete: (meetingId: string) => void;
}

const ProcessingModal: React.FC<ProcessingModalProps> = ({
    isOpen,
    onClose,
    meetingId,
    onComplete
}) => {
    const [status, setStatus] = useState<'initializing' | 'uploading' | 'transcribing' | 'analyzing' | 'completed' | 'failed'>('initializing');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState(0);

    const steps = [
        { id: 'initializing', label: 'Preparing recording...' },
        { id: 'uploading', label: 'Saving audio & video...' },
        { id: 'transcribing', label: 'Transcribing speech...' },
        { id: 'analyzing', label: 'Generating AI insights...' },
        { id: 'completed', label: 'Finalizing notes...' }
    ];

    useEffect(() => {
        if (!isOpen || !meetingId) return;

        let pollingInterval: NodeJS.Timeout;
        let isMounted = true;

        const startProcessing = async () => {
            try {
                // 1. Trigger the processing (if not already started)
                const token = localStorage.getItem('token');

                // First, tell backend to start processing
                await fetch(`${API_URL}/api/meeting-rooms/${meetingId}/process`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                // 2. Start Polling
                pollingInterval = setInterval(async () => {
                    if (!isMounted) return;

                    try {
                        const res = await fetch(`${API_URL}/api/processing-status/${meetingId}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        if (!res.ok) {
                            // If endpoint doesn't exist yet, just fake it for demo or error out
                            if (res.status === 404) {
                                // Fallback simulation for now until endpoint is fully ready
                                simulateProgress();
                                clearInterval(pollingInterval);
                                return;
                            }
                            throw new Error('Failed to check status');
                        }

                        const data = await res.json();

                        // Map backend steps to frontend stats
                        // Assuming backend returns { detailed_status: [ { step: '...', status: '...' } ] }
                        // For now we'll rely on the simple 'status' field and simulate progress if needed or read from data

                        if (data.status === 'completed') {
                            setStatus('completed');
                            setProgress(100);
                            clearInterval(pollingInterval);
                            setTimeout(() => onComplete(meetingId), 1000);
                        } else if (data.status === 'failed') {
                            setStatus('failed');
                            setError(data.error || 'Processing failed');
                            clearInterval(pollingInterval);
                        } else {
                            // Map processing steps to progress roughly
                            // This depends on what backend returns. 
                            // If backend doesn't return granular progress, we simulate it based on steps
                            if (data.current_step) {
                                const stepIdx = steps.findIndex(s => s.id === data.current_step);
                                if (stepIdx !== -1) {
                                    setStep(stepIdx);
                                    setStatus(data.current_step);
                                    setProgress((stepIdx + 1) * 20);
                                }
                            }
                        }

                    } catch (err) {
                        console.error("Polling error", err);
                        // Don't fail immediately on network blip
                    }
                }, 2000);

            } catch (err) {
                console.error("Failed to start processing", err);
                setError(err instanceof Error ? err.message : 'Failed to start processing');
            }
        };

        // Simpler simulation for the MVP if backend status isn't fully granular yet
        const simulateProgress = () => {
            let currentStep = 0;
            const interval = setInterval(() => {
                currentStep++;
                if (currentStep >= steps.length) {
                    clearInterval(interval);
                    setStatus('completed');
                    setProgress(100);
                    setTimeout(() => onComplete(meetingId), 800);
                } else {
                    setStep(currentStep);
                    setStatus(steps[currentStep].id as any);
                    setProgress((currentStep + 1) * 20);
                }
            }, 1500);
            return () => clearInterval(interval);
        };

        startProcessing();

        return () => {
            isMounted = false;
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [isOpen, meetingId]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-panel-3 border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">
                            Saving Your Meeting
                        </h2>
                        <p className="text-gray-400 mb-8">
                            Please wait while we finalize the recording and generate your AI notes.
                        </p>

                        {/* Progress Circle or Bar */}
                        <div className="relative w-full h-4 bg-gray-700 rounded-full mb-6 overflow-hidden">
                            <motion.div
                                className="absolute top-0 left-0 h-full tile-accent"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>

                        {/* Steps */}
                        <div className="space-y-3 text-left">
                            {steps.slice(0, 4).map((s, idx) => (
                                <div key={s.id} className="flex items-center space-x-3">
                                    <div className={`p-1 rounded-full ${idx < step ? 'bg-green-500/20 text-green-400' : idx === step ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-gray-700 text-gray-500'}`}>
                                        {idx < step ? (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border-2 border-current" />
                                        )}
                                    </div>
                                    <span className={`${idx === step ? 'text-white font-medium' : 'text-gray-500'}`}>
                                        {s.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {error && (
                            <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {error}
                                <button onClick={onClose} className="ml-2 underline">Close</button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ProcessingModal;
