import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Monitor, MicOff, Mic, Hand, Crown as CrownIcon, WifiOff, Share, Maximize2, X, Users, MessageSquare } from 'lucide-react';
import { Participant } from './types';
import MiniVideoBox from './MiniVideoBox';

interface VideoGridProps {
    participants: Participant[];
    userName: string;
    isVideoEnabled: boolean;
    localStreamRef: React.RefObject<MediaStream | null>;
    localVideoRef: React.RefObject<HTMLVideoElement>;
    isScreenSharing: boolean;
    isAudioEnabled: boolean;
    isOwner: boolean;
    isSpeaking: boolean;
    dominantSpeaker: string;
    isHandRaised: boolean;
    onStopScreenShare?: () => void;
    remoteVideoRefs?: React.RefObject<{ [key: string]: HTMLVideoElement | null }>;
    isChatOpen?: boolean;
    isParticipantsOpen?: boolean;
    /** Live camera streams from LiveKit, keyed by participant id. */
    remoteStreams?: { [userId: string]: MediaStream };
    /** Screen-share streams from LiveKit, keyed by participant id. */
    remoteScreenStreams?: { [userId: string]: MediaStream };
}

const VideoGrid: React.FC<VideoGridProps> = ({
    participants,
    userName,
    isVideoEnabled,
    isAudioEnabled,
    localStreamRef,
    localVideoRef,
    isScreenSharing,
    isOwner,
    isSpeaking,
    dominantSpeaker,
    isHandRaised,
    onStopScreenShare,
    remoteVideoRefs,
    isChatOpen = false,
    isParticipantsOpen = false,
    remoteStreams = {},
    remoteScreenStreams = {}
}) => {
    const totalParticipants = Math.max(1, participants.length + 1);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [showMiniVideo, setShowMiniVideo] = useState(true);

    // Find if anyone is screen sharing
    const screenSharingParticipant = participants.find(p => p.isScreenSharing);
    const isAnyoneScreenSharing = isScreenSharing || !!screenSharingParticipant;
    const isLocalScreenSharing = isScreenSharing;

    // Reset mini video visibility when screen sharing starts
    useEffect(() => {
        if (isLocalScreenSharing) {
            setShowMiniVideo(true);
        }
    }, [isLocalScreenSharing]);

    // Calculate container size based on sidebar state
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setContainerSize({ width, height });
            }
        };

        updateSize();
        const resizeObserver = new ResizeObserver(updateSize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        window.addEventListener('resize', updateSize);
        return () => {
            window.removeEventListener('resize', updateSize);
            resizeObserver.disconnect();
        };
    }, [isChatOpen, isParticipantsOpen]);

    // Calculate optimal grid layout
    const gridLayout = useMemo(() => {
        if (isAnyoneScreenSharing) {
            return {
                gridCols: 'grid-cols-1',
                videoWidth: '100%',
                videoHeight: '100%',
                isSpotlight: true
            };
        }

        // Calculate available space (100vh minus meeting controls height)
        const meetingControlsHeight = 64; // Adjust this based on your actual controls height

        let availableHeight = 800; // Default fallback
        let availableWidth = 1024; // Default fallback

        if (typeof window !== 'undefined') {
            availableHeight = window.innerHeight - meetingControlsHeight - 32;
            const isMobile = window.innerWidth < 1024;
            const sidebarOffset = ((isChatOpen || isParticipantsOpen) && !isMobile) ? 320 : 0;
            availableWidth = window.innerWidth - sidebarOffset - 32;
        }

        // Calculate best grid configuration
        let cols = 1;
        let rows = 1;

        if (totalParticipants === 1) {
            cols = 1;
            rows = 1;
        } else if (totalParticipants === 2) {
            cols = 2;
            rows = 1;
        } else if (totalParticipants <= 4) {
            cols = 2;
            rows = Math.ceil(totalParticipants / 2);
        } else if (totalParticipants <= 9) {
            cols = 3;
            rows = Math.ceil(totalParticipants / 3);
        } else if (totalParticipants <= 16) {
            cols = 4;
            rows = Math.ceil(totalParticipants / 4);
        } else {
            cols = 5;
            rows = Math.ceil(totalParticipants / 5);
        }

        // Calculate video size maintaining 16:9 aspect ratio
        const aspectRatio = 16 / 9;
        const gap = 8; // 8px gap between videos
        const maxVideoWidth = (availableWidth - (gap * (cols - 1))) / cols;
        const maxVideoHeight = (availableHeight - (gap * (rows - 1))) / rows;

        // Calculate actual size maintaining aspect ratio
        let width = maxVideoWidth;
        let height = width / aspectRatio;

        if (height > maxVideoHeight) {
            height = maxVideoHeight;
            width = height * aspectRatio;
        }

        // Ensure minimum size
        const minSize = 160;
        if (width < minSize) {
            width = minSize;
            height = width / aspectRatio;
        }

        return {
            gridCols: `grid-cols-${cols}`,
            videoWidth: width,
            videoHeight: height,
            cols,
            rows,
            isSpotlight: false
        };
    }, [totalParticipants, containerSize, isChatOpen, isParticipantsOpen, isAnyoneScreenSharing]);

    const applyVideoStyles = () => {
        if (localVideoRef.current) {
            localVideoRef.current.style.objectFit = isScreenSharing ? 'contain' : 'cover';
            localVideoRef.current.style.transform = isScreenSharing ? 'none' : 'scaleX(-1)';
            localVideoRef.current.style.backgroundColor = '#000';
        }
    };

    useEffect(() => {
        if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            applyVideoStyles();
            localVideoRef.current.muted = true;
            localVideoRef.current.playsInline = true;

            if (localVideoRef.current.paused && (isVideoEnabled || isScreenSharing)) {
                localVideoRef.current.play().catch(console.warn);
            }
        }
    }, [isVideoEnabled, isScreenSharing, localStreamRef.current]);

    /**
     * Point a tile's <video> at the matching LiveKit stream.
     *
     * Registers the element in remoteVideoRefs (other code still reads that) and
     * assigns srcObject. Muted on purpose: RemoteAudioSink owns audio playback so
     * that a participant with their camera off is still audible.
     */
    const bindRemoteVideo = (
        el: HTMLVideoElement | null,
        participantId: string,
        kind: 'camera' | 'screen' = 'camera'
    ) => {
        if (remoteVideoRefs?.current) {
            remoteVideoRefs.current[participantId] = el;
        }
        if (!el) return;

        const source = kind === 'screen' ? remoteScreenStreams : remoteStreams;
        const stream = source[participantId];
        if (stream && el.srcObject !== stream) {
            el.srcObject = stream;
            el.muted = true;
            el.playsInline = true;
            el.play().catch(() => undefined);
        }
    };

    // Streams usually arrive after the tile has mounted, so re-bind on change.
    useEffect(() => {
        if (!remoteVideoRefs?.current) return;
        Object.entries(remoteVideoRefs.current).forEach(([participantId, el]) => {
            if (!el) return;
            const stream = remoteScreenStreams[participantId] || remoteStreams[participantId];
            if (stream && el.srcObject !== stream) {
                el.srcObject = stream;
                el.muted = true;
                el.playsInline = true;
                el.play().catch(() => undefined);
            }
        });
    }, [remoteStreams, remoteScreenStreams, participants, remoteVideoRefs]);

    // Screen sharing layout
    if (isAnyoneScreenSharing) {
        const screenSharer = isScreenSharing ?
            { id: 'local', name: userName, isScreenSharing: true } :
            screenSharingParticipant;

        const remoteScreenSharingParticipant = participants.find(p => p.isScreenSharing);

        return (
            <div className="relative w-full h-full bg-black" ref={containerRef}>
                <div className="absolute inset-0 flex">
                    {/* Main screen sharing area */}
                    <div
                        className={`relative transition-all duration-300 ${isChatOpen || isParticipantsOpen ? 'w-2/3' : 'w-full'
                            }`}
                    >
                        <div className="absolute inset-0 flex items-center justify-center bg-black p-4">
                            {screenSharer?.id === 'local' ? (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="max-w-full max-h-full"
                                    style={{
                                        objectFit: 'contain',
                                        backgroundColor: '#000'
                                    }}
                                />
                            ) : remoteScreenSharingParticipant ? (
                                <video
                                    ref={(el) => bindRemoteVideo(el, remoteScreenSharingParticipant.id, 'screen')}
                                    autoPlay
                                    playsInline
                                    className="max-w-full max-h-full"
                                    style={{
                                        objectFit: 'contain',
                                        backgroundColor: '#000'
                                    }}
                                />
                            ) : (
                                <div className="text-white text-center">
                                    <Monitor size={48} className="mx-auto mb-4 opacity-50" />
                                    <div className="text-lg mb-2">Screen Sharing</div>
                                    <div className="text-sm text-gray-400">Waiting for screen share...</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Participants sidebar */}
                    {(isChatOpen || isParticipantsOpen) && (
                        <div className="w-1/3 bg-gray-900 border-l border-gray-800 overflow-y-auto">
                            <div className="p-4 border-b border-gray-800">
                                <h3 className="text-white font-medium flex items-center gap-2">
                                    <Users size={20} />
                                    Participants ({participants.length + 1})
                                </h3>
                            </div>

                            {/* Local user */}
                            <div className="p-4 border-b border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        {isVideoEnabled ? (
                                            <video
                                                ref={localVideoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="w-12 h-12 rounded-full object-cover"
                                                style={{ transform: 'scaleX(-1)' }}
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full tile-accent flex items-center justify-center text-white font-bold">
                                                {userName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${isAudioEnabled ? 'bg-green-500' : 'bg-red-500'
                                            } ${isSpeaking ? 'animate-pulse' : ''}`} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-white font-medium flex items-center gap-2">
                                            {userName} (You)
                                            {isOwner && <CrownIcon size={14} className="text-yellow-400" />}
                                        </div>
                                        <div className="text-gray-400 text-sm">
                                            {isSpeaking ? 'Speaking...' : isAudioEnabled ? 'Connected' : 'Muted'}
                                        </div>
                                    </div>
                                    {isHandRaised && (
                                        <Hand size={18} className="text-yellow-400 animate-bounce" />
                                    )}
                                </div>
                            </div>

                            {/* Other participants */}
                            <div className="p-2">
                                {participants.map((participant) => (
                                    <div key={participant.id} className="flex items-center gap-3 p-3 hover:bg-gray-800/50 rounded-lg">
                                        <div className="relative">
                                            {participant.isVideoEnabled ? (
                                                <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden">
                                                    <video
                                                        ref={(el) => bindRemoteVideo(el, participant.id)}
                                                        autoPlay
                                                        playsInline
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white font-bold">
                                                    {participant.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${participant.isAudioEnabled ? 'bg-green-500' : 'bg-red-500'
                                                } ${participant.isSpeaking ? 'animate-pulse' : ''}`} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-white font-medium flex items-center gap-2">
                                                {participant.name}
                                                {participant.isTeacher && <CrownIcon size={14} className="text-yellow-400" />}
                                            </div>
                                            <div className="text-gray-400 text-sm">
                                                {participant.isSpeaking ? 'Speaking...' : participant.isAudioEnabled ? 'Connected' : 'Muted'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {participant.isHandRaised && (
                                                <Hand size={18} className="text-yellow-400 animate-bounce" />
                                            )}
                                            {participant.connectionQuality === 'poor' && (
                                                <WifiOff size={18} className="text-red-400" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Mini Video Box for local camera when screen sharing */}
                {isLocalScreenSharing && isVideoEnabled && showMiniVideo && (
                    <MiniVideoBox
                        isVisible={true}
                        localStreamRef={localStreamRef}
                        userName={userName}
                        isVideoEnabled={isVideoEnabled}
                        isAudioEnabled={isAudioEnabled}
                        isSpeaking={isSpeaking}
                        isHandRaised={isHandRaised}
                        isOwner={isOwner}
                        onClose={() => setShowMiniVideo(false)}
                    />
                )}
            </div>
        );
    }

    // Regular grid view
    const { gridCols, videoWidth, videoHeight } = gridLayout;

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full p-4 flex items-center justify-center bg-black"
            style={{
                height: 'calc(100vh - 64px)', // Fixed height minus meeting controls
                overflow: 'hidden' // Prevent scrollbars
            }}
        >
            <div
                className={`grid ${gridCols} gap-2 w-full h-full place-items-center`}
                style={{
                    maxHeight: '100%',
                    overflow: 'hidden'
                }}
            >
                {/* Local video */}
                <motion.div
                    className={`relative rounded-lg overflow-hidden bg-gray-900 ${isSpeaking && isAudioEnabled ? 'ring-2 ring-green-500' : ''
                        }`}
                    style={{
                        width: videoWidth,
                        height: videoHeight,
                        minWidth: videoWidth,
                        minHeight: videoHeight,
                        boxShadow: isSpeaking && isAudioEnabled
                            ? '0 0 0 2px rgba(var(--brand-rgb), 0.7), 0 4px 20px rgba(0, 0, 0, 0.3)'
                            : '0 4px 20px rgba(0, 0, 0, 0.3)',
                        transition: 'box-shadow 0.3s ease'
                    }}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    {isVideoEnabled ? (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full"
                            style={{
                                objectFit: 'cover',
                                transform: 'scaleX(-1)'
                            }}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                            <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center text-xl font-bold text-white">
                                {userName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    )}

                    {/* Bottom info bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isAudioEnabled ? 'bg-green-500' : 'bg-red-500'
                                    } ${isSpeaking && isAudioEnabled ? 'animate-pulse' : ''}`} />
                                <span className="text-white text-xs font-medium truncate max-w-[80px]">
                                    {userName}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                {isOwner && (
                                    <CrownIcon size={10} className="text-yellow-400" />
                                )}
                                {isHandRaised && (
                                    <Hand size={10} className="text-yellow-400 animate-bounce" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Speaking indicator */}
                    {isSpeaking && isAudioEnabled && (
                        <div className="absolute top-2 left-2">
                            <div className="flex items-center gap-1 bg-green-500/20 backdrop-blur-sm px-2 py-1 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] text-green-400">Speaking</span>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Remote participants */}
                {participants.map((participant, index) => (
                    <motion.div
                        key={participant.id}
                        className={`relative rounded-lg overflow-hidden bg-gray-900 ${participant.isSpeaking && participant.isAudioEnabled ? 'ring-2 ring-green-500' : ''
                            }`}
                        style={{
                            width: videoWidth,
                            height: videoHeight,
                            minWidth: videoWidth,
                            minHeight: videoHeight,
                            boxShadow: participant.isSpeaking && participant.isAudioEnabled
                                ? '0 0 0 2px rgba(var(--brand-rgb), 0.7), 0 4px 20px rgba(0, 0, 0, 0.3)'
                                : '0 4px 20px rgba(0, 0, 0, 0.3)',
                            transition: 'box-shadow 0.3s ease'
                        }}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                        {participant.isVideoEnabled && remoteStreams[participant.id] ? (
                            <video
                                ref={(el) => bindRemoteVideo(el, participant.id)}
                                autoPlay
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-600/30 to-gray-700/30 flex items-center justify-center text-xl font-bold text-white">
                                    {participant.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        )}

                        {/* Bottom info bar */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${participant.isAudioEnabled ? 'bg-green-500' : 'bg-red-500'
                                        } ${participant.isSpeaking && participant.isAudioEnabled ? 'animate-pulse' : ''}`} />
                                    <span className="text-white text-xs font-medium truncate max-w-[80px]">
                                        {participant.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {participant.isTeacher && (
                                        <CrownIcon size={10} className="text-yellow-400" />
                                    )}
                                    {participant.isHandRaised && (
                                        <Hand size={10} className="text-yellow-400 animate-bounce" />
                                    )}
                                    {participant.connectionQuality === 'poor' && (
                                        <WifiOff size={10} className="text-red-400" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Speaking indicator */}
                        {participant.isSpeaking && participant.isAudioEnabled && (
                            <div className="absolute top-2 left-2">
                                <div className="flex items-center gap-1 bg-green-500/20 backdrop-blur-sm px-2 py-1 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] text-green-400">Speaking</span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Participants count badge */}
            <div className="absolute top-4 right-4">
                <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-700">
                    <Users size={14} className="text-gray-300" />
                    <span className="text-white text-sm">
                        {totalParticipants}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default VideoGrid;