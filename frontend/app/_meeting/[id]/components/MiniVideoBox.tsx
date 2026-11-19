'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, PinOff, Minimize2, Maximize2, Hand, MicOff, Mic, Crown as CrownIcon } from 'lucide-react';

interface MiniVideoBoxProps {
    isVisible: boolean;
    localStreamRef: React.RefObject<MediaStream | null>;
    userName: string;
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
    isSpeaking: boolean;
    isHandRaised: boolean;
    isOwner: boolean;
    onClose?: () => void;
}

const MiniVideoBox: React.FC<MiniVideoBoxProps> = ({
    isVisible,
    localStreamRef,
    userName,
    isVideoEnabled,
    isAudioEnabled,
    isSpeaking,
    isHandRaised,
    isOwner,
    onClose
}) => {
    const [isPinned, setIsPinned] = useState(false);
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isMinimized, setIsMinimized] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Set up video stream
    useEffect(() => {
        const setupVideoStream = async () => {
            if (!videoRef.current || !isVisible) return;

            try {
                if (isVideoEnabled && !isMinimized) {
                    // Get a fresh camera stream for the mini video
                    const cameraStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 320 },
                            height: { ideal: 240 },
                            frameRate: { ideal: 15 }
                        },
                        audio: false
                    });

                    videoRef.current.srcObject = cameraStream;
                    videoRef.current.muted = true;
                    videoRef.current.playsInline = true;
                    
                    try {
                        await videoRef.current.play();
                    } catch (playError) {
                        console.warn('Mini video auto-play prevented:', playError);
                    }
                } else {
                    // Stop camera when minimized or video disabled
                    if (videoRef.current?.srcObject) {
                        const stream = videoRef.current.srcObject as MediaStream;
                        stream.getTracks().forEach(track => track.stop());
                        videoRef.current.srcObject = null;
                    }
                }
            } catch (error) {
                console.error('Error setting up mini video stream:', error);
            }
        };

        setupVideoStream();

        return () => {
            // Cleanup the camera stream when component unmounts
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        };
    }, [isVisible, isVideoEnabled, isMinimized]);

    // Handle mouse down for dragging - anywhere on the box
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (isPinned) return;
        
        // Prevent dragging when clicking on buttons
        if ((e.target as HTMLElement).closest('button')) return;
        
        e.preventDefault();
        setIsDragging(true);
        
        const rect = boxRef.current?.getBoundingClientRect();
        if (rect) {
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    }, [isPinned]);

    // Handle mouse move for dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || isPinned) return;

            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;

            // Keep within viewport bounds
            const boxWidth = isMinimized ? 160 : 200;
            const boxHeight = isMinimized ? 40 : 150;
            const maxX = window.innerWidth - boxWidth;
            const maxY = window.innerHeight - boxHeight;

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, isPinned, isMinimized]);

    // Toggle pin state
    const togglePin = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPinned(prev => !prev);
    }, []);

    // Toggle minimize state
    const toggleMinimize = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMinimized(prev => !prev);
    }, []);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                ref={boxRef}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                onMouseDown={handleMouseDown}
                className={`fixed z-50 rounded-2xl overflow-hidden shadow-2xl select-none ${
                    isDragging ? 'cursor-grabbing' : isPinned ? 'cursor-default' : 'cursor-grab'
                }`}
                style={{
                    left: position.x,
                    top: position.y,
                    width: isMinimized ? 160 : 200,
                    height: isMinimized ? 40 : 150,
                    boxShadow: isSpeaking 
                        ? '0 0 0 2px rgba(var(--brand-rgb), 0.7), 0 10px 40px rgba(0, 0, 0, 0.4)' 
                        : '0 10px 40px rgba(0, 0, 0, 0.4)',
                    transition: isDragging ? 'none' : 'box-shadow 0.3s ease, width 0.3s ease, height 0.3s ease'
                }}
            >
                {/* Glass morphism background */}
                <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-xl" />

                {/* Speaking glow ring */}
                {isSpeaking && (
                    <motion.div
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ 
                            opacity: [0.4, 0.8, 0.4],
                            boxShadow: [
                                'inset 0 0 10px rgba(var(--brand-rgb), 0.3)',
                                'inset 0 0 20px rgba(var(--brand-rgb), 0.5)',
                                'inset 0 0 10px rgba(var(--brand-rgb), 0.3)'
                            ]
                        }}
                        transition={{ 
                            duration: 1.5, 
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{
                            border: '2px solid rgba(var(--brand-rgb), 0.6)'
                        }}
                    />
                )}

                {/* Minimized View */}
                {isMinimized ? (
                    <div className="relative w-full h-full flex items-center justify-between px-3">
                        {/* User info */}
                        <div className="flex items-center gap-2">
                            {/* Speaking indicator */}
                            <div className={`w-2.5 h-2.5 rounded-full ${
                                isSpeaking && isAudioEnabled 
                                    ? 'bg-green-500 animate-pulse' 
                                    : isAudioEnabled 
                                        ? 'bg-green-500' 
                                        : 'bg-red-500'
                            }`} />
                            
                            {/* Username */}
                            <span className="text-white text-xs font-medium truncate max-w-[60px]">
                                {userName}
                            </span>
                            
                            {/* Owner badge */}
                            {isOwner && (
                                <CrownIcon size={10} className="text-yellow-400" />
                            )}
                            
                            {/* Mute icon */}
                            {!isAudioEnabled && (
                                <MicOff size={10} className="text-red-400" />
                            )}
                            
                            {/* Hand raised */}
                            {isHandRaised && (
                                <Hand size={10} className="text-yellow-400 animate-bounce" />
                            )}
                        </div>

                        {/* Control buttons */}
                        <div className="flex items-center gap-1">
                            {/* Pin Button */}
                            <button
                                onClick={togglePin}
                                className={`p-1 rounded-full transition-all ${
                                    isPinned 
                                        ? 'bg-green-500/30 text-green-400' 
                                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                                }`}
                                title={isPinned ? 'Unpin position' : 'Pin position'}
                            >
                                {isPinned ? <Pin size={10} /> : <PinOff size={10} />}
                            </button>

                            {/* Expand Button */}
                            <button
                                onClick={toggleMinimize}
                                className="p-1 rounded-full bg-white/10 text-white/70 hover:bg-blue-500/30 hover:text-blue-400 transition-all"
                                title="Expand"
                            >
                                <Maximize2 size={10} />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Full View */
                    <div className="relative w-full h-full">
                        {isVideoEnabled ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ transform: 'scaleX(-1)' }}
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                                <div className="w-16 h-16 rounded-full tile-accent flex items-center justify-center text-white font-bold text-2xl">
                                    {userName.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        )}

                        {/* Top Controls Bar */}
                        <div className="absolute top-0 left-0 right-0 p-2 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
                            {/* Drag hint */}
                            <div className="text-white/50 text-[8px] uppercase tracking-wide">
                                {isPinned ? '📌 Pinned' : 'Drag to move'}
                            </div>

                            {/* Control Buttons */}
                            <div className="flex items-center gap-1">
                                {/* Pin Button */}
                                <button
                                    onClick={togglePin}
                                    className={`p-1.5 rounded-full transition-all ${
                                        isPinned 
                                            ? 'bg-green-500/30 text-green-400' 
                                            : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                                    }`}
                                    title={isPinned ? 'Unpin position' : 'Pin position'}
                                >
                                    {isPinned ? <Pin size={12} /> : <PinOff size={12} />}
                                </button>

                                {/* Minimize Button */}
                                <button
                                    onClick={toggleMinimize}
                                    className="p-1.5 rounded-full bg-white/10 text-white/70 hover:bg-yellow-500/30 hover:text-yellow-400 transition-all"
                                    title="Minimize"
                                >
                                    <Minimize2 size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Bottom Info Bar */}
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="flex items-center justify-between">
                                {/* Name and speaking indicator */}
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${
                                        isSpeaking && isAudioEnabled 
                                            ? 'bg-green-500 animate-pulse' 
                                            : isAudioEnabled 
                                                ? 'bg-green-500' 
                                                : 'bg-red-500'
                                    }`} />
                                    <span className="text-white text-[10px] font-medium truncate max-w-[80px]">
                                        {userName}
                                    </span>
                                    {isOwner && (
                                        <CrownIcon size={10} className="text-yellow-400" />
                                    )}
                                </div>

                                {/* Status Icons */}
                                <div className="flex items-center gap-1">
                                    {/* Hand Raised */}
                                    {isHandRaised && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1, y: [0, -2, 0] }}
                                            transition={{ 
                                                scale: { duration: 0.2 },
                                                y: { duration: 0.5, repeat: Infinity }
                                            }}
                                        >
                                            <Hand size={12} className="text-yellow-400" />
                                        </motion.div>
                                    )}

                                    {/* Mute Status */}
                                    {!isAudioEnabled && (
                                        <MicOff size={12} className="text-red-400" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Drag overlay when dragging */}
                {isDragging && (
                    <div className="absolute inset-0 bg-blue-500/10 rounded-2xl border-2 border-blue-400/50 pointer-events-none" />
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default MiniVideoBox;
