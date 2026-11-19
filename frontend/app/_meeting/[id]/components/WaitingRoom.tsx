'use client';
import { API_URL } from "@/lib/config"
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mic, MicOff, Video, VideoOff, User, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WaitingRoomProps {
    meetingId: string;
    socket: any;
    onApproved: (meetingData: any) => void;
}

export default function WaitingRoom({ meetingId, socket, onApproved }: WaitingRoomProps) {
    const router = useRouter();
    const [userName, setUserName] = useState('Guest');
    const [userId, setUserId] = useState('');
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isRequesting, setIsRequesting] = useState(false);
    const [isWaitingApproval, setIsWaitingApproval] = useState(false);
    const [rejectionMessage, setRejectionMessage] = useState('');
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        // Fetch user info from token
        const fetchUserInfo = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await fetch(`${API_URL}/api/auth/check`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data.valid) {
                        setUserName(data.user_name || data.user_email?.split('@')[0] || 'Guest');
                        setUserId(data.user_id);
                    }
                } catch (error) {
                    console.error('Failed to fetch user info:', error);
                }
            }
        };

        fetchUserInfo();
    }, []);

    useEffect(() => {
        // Initialize media devices for preview
        const initMediaDevices = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: isCameraOn,
                    audio: isMicOn
                });

                localStreamRef.current = stream;

                if (localVideoRef.current && isCameraOn) {
                    localVideoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Failed to access media devices:', error);
                toast.error('Could not access camera or microphone');
            }
        };

        initMediaDevices();

        // Cleanup on unmount
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        // Update video stream when camera toggle changes
        if (localStreamRef.current && localVideoRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = isCameraOn;
            }

            if (isCameraOn) {
                localVideoRef.current.srcObject = localStreamRef.current;
            } else {
                localVideoRef.current.srcObject = null;
            }
        }
    }, [isCameraOn]);

    useEffect(() => {
        // Update audio stream when mic toggle changes
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = isMicOn;
            }
        }
    }, [isMicOn]);

    useEffect(() => {
        if (!socket) return;

        // Listen for approval/rejection
        socket.on('join-approved', (data: any) => {
            toast.success('Join request approved! Joining meeting...');
            onApproved(data);
        });

        socket.on('join-rejected', (data: any) => {
            setIsWaitingApproval(false);
            setIsRequesting(false);
            setRejectionMessage(data.message || 'The host declined your request to join');
            toast.error(data.message || 'Join request rejected');
        });

        return () => {
            socket.off('join-approved');
            socket.off('join-rejected');
        };
    }, [socket, onApproved]);

    const handleRequestJoin = () => {
        if (!socket || !userId) {
            toast.error('Connection error. Please refresh the page.');
            return;
        }

        setIsRequesting(true);
        setIsWaitingApproval(true);

        // The join-meeting event will trigger the approval flow in backend
        socket.emit('join-meeting', {
            meetingId,
            userName,
            userId,
            userEmail: userName + '@example.com'
        });

        toast.success('Join request sent to host');
    };

    const toggleMic = () => {
        setIsMicOn(!isMicOn);
    };

    const toggleCamera = () => {
        setIsCameraOn(!isCameraOn);
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4"
            style={{
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-foreground)',
                background: `radial-gradient(ellipse at top left, rgba(var(--brand-rgb), 0.12) 0%, transparent 50%),
          radial-gradient(ellipse at top right, rgba(var(--sand-rgb), 0.12) 0%, transparent 50%),
          radial-gradient(ellipse at bottom, rgba(var(--brand-rgb), 0.12) 0%, transparent 50%),
          var(--panel)`
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl"
            >
                <Card className="border-line bg-gray-800/50 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
                            <User className="w-8 h-8 text-primary" />
                            {isWaitingApproval ? 'Waiting for Host Approval' : 'Join Meeting'}
                        </CardTitle>
                        <p className="text-gray-400 mt-2">
                            {isWaitingApproval
                                ? 'The host will approve your request shortly...'
                                : 'Set up your audio and video before joining'}
                        </p>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* User Info */}
                        <div className="text-center p-4 rounded-xl bg-white/5 border border-line">
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-12 h-12 rounded-full tile-accent flex items-center justify-center text-xl font-bold">
                                    {userName[0]?.toUpperCase() || 'G'}
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-semibold">{userName}</h3>
                                    <p className="text-sm text-gray-400">Participant</p>
                                </div>
                            </div>
                        </div>

                        {/* Video Preview */}
                        <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video">
                            {isCameraOn ? (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover mirror"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <VideoOff className="w-16 h-16 text-gray-500 mx-auto mb-2" />
                                        <p className="text-gray-400">Camera is off</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Media Controls */}
                        <div className="flex justify-center gap-4">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleMic}
                                disabled={isWaitingApproval}
                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMicOn
                                    ? 'bg-gray-700 hover:bg-gray-600'
                                    : 'bg-red-500 hover:bg-red-600'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isMicOn ? (
                                    <Mic className="w-6 h-6 text-white" />
                                ) : (
                                    <MicOff className="w-6 h-6 text-white" />
                                )}
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleCamera}
                                disabled={isWaitingApproval}
                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isCameraOn
                                    ? 'bg-gray-700 hover:bg-gray-600'
                                    : 'bg-red-500 hover:bg-red-600'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isCameraOn ? (
                                    <Video className="w-6 h-6 text-white" />
                                ) : (
                                    <VideoOff className="w-6 h-6 text-white" />
                                )}
                            </motion.button>
                        </div>

                        {/* Rejection Message */}
                        <AnimatePresence>
                            {rejectionMessage && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                                >
                                    <p className="text-red-400 text-center">{rejectionMessage}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Join Button or Waiting Status */}
                        {isWaitingApproval ? (
                            <div className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/30">
                                <div className="flex items-center justify-center gap-3 text-blue-400">
                                    <Clock className="w-5 h-5 animate-pulse" />
                                    <p className="font-medium">Waiting for host approval...</p>
                                </div>
                            </div>
                        ) : (
                            <Button
                                onClick={handleRequestJoin}
                                disabled={isRequesting || !userName}
                                className="w-full h-14 text-lg font-semibold tile-accent hover:opacity-90 transition-opacity"
                            >
                                {isRequesting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Requesting...
                                    </>
                                ) : (
                                    'Request to Join'
                                )}
                            </Button>
                        )}

                        {/* Cancel Button */}
                        <Button
                            onClick={() => router.push('/')}
                            variant="outline"
                            className="w-full border-line hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>

            <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
        </div>
    );
}
