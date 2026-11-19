'use client';
import { API_URL } from "@/lib/config"
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Components
import VideoGrid from './components/VideoGrid';
import MeetingControls from './components/MeetingControls';
import Sidebar from './components/Sidebar';
import FloatingEmojis from './components/FloatingEmojis';
import CaptionsOverlay from './components/CaptionsOverlay';
import MoodIndicator from './components/MoodIndicator';
import MeetingHeader from './components/MeetingHeader';
import FocusNotification from './components/FocusNotification';
import WaitingRoom from './components/WaitingRoom';
import ApprovalNotification from './components/ApprovalNotification';
import RecordingPromptModal from './components/RecordingPromptModal';
import RemoteAudioSink from '@/components/meeting/RemoteAudioSink';

// Real-time audio/video (LiveKit SFU)
import { useLiveKitCall } from '@/hooks/useLiveKitCall';

// Modals
import AIChatModal from './components/modals/AIChatModal';
import NewQuestionModal from './components/modals/NewQuestionModal';
import AnswerDetailsModal from './components/modals/AnswerDetailsModal';
import AnalyticsModal from './components/modals/AnalyticsModal';
import CommandHelpModal from './components/modals/CommandHelpModal';
import PostMeetingModal from './components/modals/PostMeetingModal';

// Utils
import {
    getCurrentUserId,
    createLocalVideoPlaceholder,
    analyzeSentiment,
    extractTopic,
    extractKeywords,
    extractTask,
    copyMeetingLink
} from './components/utils/meetingUtils';

import {
    handleCommand,
    generateMeetingSummary,
    handleNextSpeaker as handleNextSpeakerUtil,
    showDecisions,
    muteAllParticipants,
    highlightMessage,
    getAIReaction,
    handleArgumentDetection,
    handleConfusionDetection,
    handleTaskDetection,
    handleQuestionDetection,
    updateMood,
    detectPotentialConflict,
    generateMeetingInsight,
    generateAIResponse
} from './components/utils/aiUtils';

import {
    sendQuizQuestion as sendQuizQuestionUtil,
    submitQuizAnswer as submitQuizAnswerUtil,
    updateLeaderboard,
    updateQuizAnalytics,
    calculateImprovementRate,
    findWeakAreas,
    findStrongAreas,
    generateAIQuestion as generateAIQuestionUtil
} from './components/utils/quizUtils';

import {
    setupSocketListeners,
    initializeMeeting,
    initializeMediaDevices,
    initializeSpeechRecognition,
    cleanupResources,
    toggleScreenShare,
    toggleAudio,
    toggleVideo,
    toggleRecording as toggleRecordingUtil,
    toggleHand,
    leaveMeeting,
    startVoiceRecording,
    handleImageUpload,
    requestGhostReplay,
    createFollowUpTask,
    executeFollowUpTask as executeFollowUpTaskUtil,
    sendReaction,
    sendMessageReaction,
    startMeetingRecording,
    stopMeetingRecording,
} from './components/utils/socketUtils';

// Types
import {
    Participant,
    Caption,
    ChatMessage,
    MoodPoint,
    Conflict,
    AgreementScore,
    MeetingInsight,
    GhostReplay,
    FollowUpTask,
    QuizQuestion,
    QuizAnswer,
    QuizSession,
    QuizAnalytics,
    Command,
    FloatingEmoji,
    TranscriptEntry
} from './components/types';

// Available languages
const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "zh", name: "Chinese" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "hi", name: "Hindi" },
    { code: "ar", name: "Arabic" },
];

const MeetingPage = () => {
    const params = useParams();
    const router = useRouter();
    const meetingId = params.id as string;

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const socketRef = useRef<any>(null);
    const peersRef = useRef<{ [key: string]: any }>({});
    const recognitionRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const quizScrollRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const participantsRef = useRef<Participant[]>([]);

    // State
    const [isMobile, setIsMobile] = useState(false);
    const [participants, setParticipants] = useState<Participant[]>([]);

    // Keep participantsRef in sync
    useEffect(() => {
        participantsRef.current = participants;
    }, [participants]);

    const [captions, setCaptions] = useState<Caption[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const searchParams = useSearchParams();
    const [isAudioEnabled, setIsAudioEnabled] = useState(searchParams.get('mic') !== 'false');
    const [isVideoEnabled, setIsVideoEnabled] = useState(searchParams.get('cam') !== 'false');
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [focusNotifications, setFocusNotifications] = useState<Array<{ id: string, userId: string, userName: string, isFocused: boolean, timestamp: Date }>>([]);
    const [targetLanguage, setTargetLanguage] = useState('en');
    const [userName, setUserName] = useState('Teacher');
    const [userEmail, setUserEmail] = useState('');
    const [isCaptionsEnabled, setIsCaptionsEnabled] = useState(true);
    const [isLiveTranslationEnabled, setIsLiveTranslationEnabled] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'participants' | 'chat' | 'ai' | 'insights' | 'quiz' | 'tasks'>('quiz');
    const [showControls, setShowControls] = useState(true);
    const [showPostMeetingPopup, setShowPostMeetingPopup] = useState(false);
    const [showRecordingPrompt, setShowRecordingPrompt] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [popupTitle, setPopupTitle] = useState('');
    const [popupLanguage, setPopupLanguage] = useState('en');
    // Nobody is the host until the server says so. This used to default to true,
    // which handed host controls (and the approve/reject buttons) to every guest.
    const [isOwner, setIsOwner] = useState(false);
    const [meeting, setMeeting] = useState<any>(null);
    const [autoRecord, setAutoRecord] = useState(false);
    const [recordingId, setRecordingId] = useState<string | null>(null);
    const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState(false);
    const recordingStartedRef = useRef(false); // Guard: prevents double auto-record start
    const screenStreamRef = useRef<MediaStream | null>(null); // Screen share stream for recording
    const micStreamRef = useRef<MediaStream | null>(null); // Mic stream for recording
    const audioRecordedChunksRef = useRef<Blob[]>([]); // Audio-only chunks for AssemblyAI
    const audioRecorderRef = useRef<MediaRecorder | null>(null); // Audio-only recorder
    const [isConnectionQualityVisible, setIsConnectionQualityVisible] = useState(false);
    const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
    const [isBackgroundBlurred, setIsBackgroundBlurred] = useState(false);
    const [videoLayout, setVideoLayout] = useState<'grid' | 'speaker' | 'immersive'>('grid');
    const [aiMode, setAiMode] = useState<'private' | 'group'>('private');
    const [isAIEnabled, setIsAIEnabled] = useState(true);
    const [aiSensitivity, setAiSensitivity] = useState(75);
    const [moodHistory, setMoodHistory] = useState<MoodPoint[]>([
        { time: 0, mood: 'neutral', intensity: 50, reason: 'Meeting started' }
    ]);
    const [currentMood, setCurrentMood] = useState<'positive' | 'neutral' | 'negative'>('neutral');
    const [moodIntensity, setMoodIntensity] = useState(50);
    const [detectedConflicts, setDetectedConflicts] = useState<Conflict[]>([]);
    const [agreementScore, setAgreementScore] = useState<AgreementScore>({
        overall: 75,
        clarity: 80,
        alignment: 70,
        disagreements: [],
        confusionLevel: 20,
        timeline: []
    });
    const [aiChatInput, setAiChatInput] = useState('');
    const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            userId: 'ai',
            userName: 'AI Assistant',
            text: 'Hello! I\'m your AI meeting assistant. Type /help to see available commands.',
            timestamp: new Date(),
            isAI: true
        }
    ]);
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [aiInsights, setAiInsights] = useState<string[]>([]);
    const [emotionData, setEmotionData] = useState<{ [key: string]: string }>({});
    const [meetingInsights, setMeetingInsights] = useState<MeetingInsight[]>([]);
    const [dominantSpeaker, setDominantSpeaker] = useState<string>('');
    const [speakingDistribution, setSpeakingDistribution] = useState<{ [key: string]: number }>({});
    const [ghostReplays, setGhostReplays] = useState<GhostReplay[]>([]);
    const [activeGhostReplay, setActiveGhostReplay] = useState<string | null>(null);
    const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);
    const [chatMode, setChatMode] = useState<'text' | 'voice' | 'image'>('text');
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [voiceRecording, setVoiceRecording] = useState<Blob | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [commands, setCommands] = useState<Command[]>([]);
    const [showCommandHelp, setShowCommandHelp] = useState(false);
    const [quizSession, setQuizSession] = useState<QuizSession>({
        id: 'quiz1',
        title: 'Class Quiz',
        description: 'Test your knowledge!',
        questions: [],
        answers: [],
        isActive: true,
        startedAt: new Date(),
        settings: {
            shuffleQuestions: false,
            showResults: true,
            allowRetry: true,
            passingScore: 70,
            showLeaderboard: true
        },
        participants: ['student1', 'student2']
    });
    const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
    const [currentAnswer, setCurrentAnswer] = useState<string>('');
    const [userAnswers, setUserAnswers] = useState<{ [key: string]: QuizAnswer }>({});
    const [quizTimer, setQuizTimer] = useState<number | null>(null);
    const [showInsightPopup, setShowInsightPopup] = useState(false);
    const [showAnswerPopup, setShowAnswerPopup] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<QuizAnswer | null>(null);
    const [selectedUserForPrivateQuestion, setSelectedUserForPrivateQuestion] = useState<string | null>(null);
    const [quizAnalytics, setQuizAnalytics] = useState<QuizAnalytics | null>(null);
    const [liveTranscript, setLiveTranscript] = useState<TranscriptEntry[]>([]);
    const [leaderboard, setLeaderboard] = useState<Array<{
        userId: string;
        userName: string;
        score: number;
        correct: number;
        total: number;
        timeSpent: number;
        rank: number;
    }>>([]);
    const [newQuizQuestion, setNewQuizQuestion] = useState({
        question: '',
        type: 'multiple_choice' as QuizQuestion['type'],
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 10,
        difficulty: 'medium' as QuizQuestion['difficulty'],
        timeLimit: 60,
        tags: [] as string[],
        explanation: '',
        hint: '',
        isPublic: true,
        targetUserIds: [] as string[],
        attemptsAllowed: 1,
        category: 'General',
        aiGenerated: false
    });
    const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);
    const [activeQuestionTab, setActiveQuestionTab] = useState<'public' | 'private' | 'ai'>('public');
    const [quizMode, setQuizMode] = useState<'practice' | 'test' | 'competitive'>('practice');
    const [quizFilter, setQuizFilter] = useState<'all' | 'unanswered' | 'incorrect'>('all');
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [isGeneratingAIQuestion, setIsGeneratingAIQuestion] = useState(false);
    const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [aiTopic, setAiTopic] = useState('');
    const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
    const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<QuizQuestion[]>([]);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [messageReactions, setMessageReactions] = useState<{ [key: string]: { [emoji: string]: number } }>({});
    const [activeReactions, setActiveReactions] = useState<{ [key: string]: string }>({});
    const [isWaitingRoom, setIsWaitingRoom] = useState(false);
    const [pendingUsers, setPendingUsers] = useState<Array<{
        userId: string;
        userName: string;
        userEmail?: string;
        timestamp: string;
    }>>([]);
    const [userId, setUserId] = useState('');
    const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({
        participants: 0, chat: 0, ai: 0, quiz: 0, tasks: 0
    });
    // Set once the lobby lets us in (or immediately if we are the host).
    const [isAdmitted, setIsAdmitted] = useState(false);
    // Flips true after the socket exists, so listener effects do not run too early.
    const [socketReady, setSocketReady] = useState(false);
    // Held until the approval listeners are attached, then emitted as `join-meeting`.
    const [joinPayload, setJoinPayload] = useState<any>(null);

    /**
     * The actual call. Media flows over LiveKit, not Socket.IO — the socket only
     * gates entry. We do not even ask for a token until we have been admitted,
     * so a guest sitting in the waiting room never gets a media connection.
     */
    const {
        status: callStatus,
        error: callError,
        room: liveKitRoom,
        remoteStreams,
        screenStreams,
        peers: livePeers,
        localStream: liveLocalStream,
        activeSpeakerId,
        setMicEnabled,
        setCameraEnabled,
        startScreenShare,
        stopScreenShare,
        disconnect: disconnectCall,
        retry: retryCall,
    } = useLiveKitCall({
        meetingId,
        enabled: isAdmitted && !isWaitingRoom,
        initialAudioEnabled: isAudioEnabled,
        initialVideoEnabled: isVideoEnabled,
    });

    // The local tile reads localStreamRef, so point it at the track we actually
    // publish. Otherwise you would preview a camera nobody else is receiving.
    useEffect(() => {
        if (!liveLocalStream) return;
        localStreamRef.current = liveLocalStream;
        if (localVideoRef.current && localVideoRef.current.srcObject !== liveLocalStream) {
            localVideoRef.current.srcObject = liveLocalStream;
            localVideoRef.current.muted = true;
            localVideoRef.current.play().catch(() => undefined);
        }
    }, [liveLocalStream]);

    // LiveKit is the source of truth for mute / speaking / connection quality,
    // because it measures the real media path. Socket events only carry intent.
    useEffect(() => {
        if (!Object.keys(livePeers).length) return;
        setParticipants(prev => prev.map(p => {
            const live = livePeers[p.id];
            if (!live) return p;
            return {
                ...p,
                isAudioEnabled: live.isAudioEnabled,
                isVideoEnabled: live.isVideoEnabled,
                isScreenSharing: live.isScreenSharing,
                isSpeaking: live.userId === activeSpeakerId,
                connectionQuality: live.connectionQuality,
            };
        }));
    }, [livePeers, activeSpeakerId]);

    // Surface call failures instead of leaving a silent black grid.
    useEffect(() => {
        if (callStatus === 'error' && callError) {
            toast.error(callError, { duration: 8000 });
        } else if (callStatus === 'unavailable') {
            toast('Video is not configured on the server — chat and captions still work.',
                { icon: '⚠️', duration: 8000 });
        }
    }, [callStatus, callError]);

    // Fix 7: WhatsApp-style unread count helpers
    const addUnread = (tab: string) => {
        if (activeTab !== tab || !isSidebarOpen) {
            setUnreadCounts(prev => ({ ...prev, [tab]: (prev[tab] || 0) + 1 }));
        }
    };

    const handleTabClick = (tab: string) => {
        setUnreadCounts(prev => ({ ...prev, [tab]: 0 }));
    };

    // Event handlers
    const handleSidebarTabChange = (tab: typeof activeTab) => {
        if (isSidebarOpen && activeTab === tab) {
            setIsSidebarOpen(false);
        } else {
            setActiveTab(tab);
            setIsSidebarOpen(true);
        }
    };

    const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        if (chatMode === 'text') {
            sendChatMessage(chatInput);
            setChatInput('');
        }
    };

    const sendChatMessage = (text: string, sender: string = userName, attachment?: ChatMessage['attachment']) => {
        const isCommand = text.startsWith('/');

        const messageData: ChatMessage = {
            id: Date.now().toString(),
            userId: sender === 'AI Assistant' ? 'ai' : (socketRef.current?.id || 'me'),
            userName: sender,
            text,
            timestamp: new Date(),
            isCommand,
            attachment
        };

        if (isCommand) {
            messageData.commandType = text.split(' ')[0];
        }

        setChatMessages(prev => [...prev, messageData]);

        if (sender !== 'AI Assistant' && !isCommand) {
            socketRef.current?.emit('chat-message', {
                ...messageData,
                meetingId
            });
        }
    };

    const addAIMessage = (text: string) => {
        const message: ChatMessage = {
            id: Date.now().toString(),
            userId: 'ai',
            userName: 'AI Assistant',
            text,
            timestamp: new Date(),
            isAI: true
        };

        setAiMessages(prev => [...prev, message]);
        setAiInsights(prev => [...prev.slice(-5), text]);
    };

    const sendAIChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiChatInput.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            userId: 'user',
            userName: 'You',
            text: aiChatInput,
            timestamp: new Date(),
        };
        setAiMessages(prev => [...prev, userMessage]);
        const input = aiChatInput;
        setAiChatInput('');

        // Build transcript context — always send it
        const transcriptText = liveTranscript.length > 0
            ? liveTranscript.map(t => `${t.speaker}: ${t.text}`).join('\n')
            : '';

        // Determine mode based on keywords
        const lowerInput = input.toLowerCase();
        const isGhostReplay = lowerInput.includes('replay') ||
            lowerInput.includes('what did') ||
            lowerInput.includes('said about') ||
            lowerInput.includes('who said') ||
            lowerInput.includes('summarize');
        const mode = isGhostReplay ? 'ghost_replay' : 'default';

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: input, mode, context: transcriptText })
            });
            const data = await res.json();
            addAIMessage(data.response || 'AI features are temporarily unavailable. Please try again.');
        } catch (err) {
            addAIMessage('AI features are temporarily unavailable. Please try again.');
        }
    };

    const sendQuizQuestion = () => {
        sendQuizQuestionUtil({
            newQuizQuestion,
            setQuizSession,
            setCurrentQuestion,
            setQuizTimer,
            setNewQuizQuestion,
            socketRef,
            meetingId,
            userName,
            isOwner,
            setShowNewQuestionForm
        });
    };

    const submitQuizAnswer = () => {
        submitQuizAnswerUtil({
            currentQuestion,
            currentAnswer,
            quizSession,
            setQuizSession,
            setCurrentAnswer,
            setCurrentQuestion,
            setQuizTimer,
            quizTimer,
            socketRef,
            meetingId,
            userName,
            isOwner,
            updateQuizAnalytics: () => updateQuizAnalytics({
                quizSession,
                participants,
                setQuizAnalytics
            })
        });
    };

    const generateAIQuestion = async () => {
        await generateAIQuestionUtil({
            aiTopic,
            aiDifficulty,
            setIsGeneratingAIQuestion,
            setAiGeneratedQuestions,
            setNewQuizQuestion
        });
    };

    const handleProcessRecording = async () => {
        const hasVideoChunks = recordedChunksRef.current && recordedChunksRef.current.length > 0;

        if (!hasVideoChunks) {
            console.warn('No recording chunks found');
            return;
        }

        setIsUploading(true);
        setUploadError(false);
        setUploadProgress(0);

        const progressInterval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 3, 90));
        }, 100);

        try {
            const token = localStorage.getItem('token');

            // Upload VIDEO blob → /api/upload → AssemblyAI extracts audio internally
            const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            console.log(`🎬 Uploading video recording: ${(videoBlob.size / (1024 * 1024)).toFixed(2)} MB`);

            const formData = new FormData();
            formData.append('file', videoBlob, `meeting-recording-${meetingId}.webm`);
            formData.append('title', popupTitle || `Meeting: ${meetingId}`);
            formData.append('language', popupLanguage);
            formData.append('is_meeting_recording', 'true');
            if (recordingId) formData.append('recording_id', recordingId);

            const response = await fetch(
                `${API_URL}/api/upload`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                }
            );

            clearInterval(progressInterval);

            if (!response.ok) throw new Error('Failed to upload recording');

            const responseData = await response.json();
            const processingId = responseData.recording_id || recordingId || meetingId;

            setUploadProgress(100);

            cleanupResources({
                localStreamRef, remoteVideoRefs, recognitionRef, peersRef,
                audioContextRef, socketRef, controlsTimeoutRef, localVideoRef, animationFrameRef
            });

            setShowPostMeetingPopup(false);
            setIsUploading(false);
            router.push(`/processing/${processingId}`);
        } catch (error) {
            clearInterval(progressInterval);
            console.error('Error uploading recording:', error);
            setIsUploading(false);
            setUploadError(true);
            toast.error('Failed to upload recording. You can retry.');
        }
    };

    const handleDiscardRecording = async () => {
        // Update recording status to 'cancelled' in DB
        if (recordingId) {
            try {
                const token = localStorage.getItem('token');
                await fetch(
                    `${API_URL}/api/meeting-rooms/recording/${recordingId}/status`,
                    {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'cancelled' }),
                    }
                );
            } catch (e) {
                console.error('Failed to update recording status:', e);
            }
        }
        cleanupResources({
            localStreamRef, remoteVideoRefs, recognitionRef, peersRef,
            audioContextRef, socketRef, controlsTimeoutRef, localVideoRef, animationFrameRef
        });
        setShowPostMeetingPopup(false);
        router.push('/create-meeting');
    };

    const handleLeaveMeeting = () => {
        // Drop the media connection first so the other side sees you go
        // immediately instead of staring at a frozen tile.
        disconnectCall().catch(() => undefined);
        setIsAdmitted(false);

        // Stop screen share streams first to dismiss browser toolbar
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
        if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
            audioRecorderRef.current.stop();
            audioRecorderRef.current = null;
        }

        leaveMeeting({
            socketRef,
            isOwner,
            isRecording,
            mediaRecorderRef,
            recordedChunksRef,
            cleanupResources: () => cleanupResources({
                localStreamRef, remoteVideoRefs, recognitionRef, peersRef,
                audioContextRef, socketRef, controlsTimeoutRef, localVideoRef
            }),
            router,
            meetingId,
            getCurrentUserId,
            toast,
            localVideoRef,
            setShowPostMeetingPopup,
            recordingStartTime,
            recordingId,
        });
    };

    // Start screen recording — one click, browser dialog is the only confirmation
    const startAutoRecording = async () => {
        // Guard: only fire once (React StrictMode can double-invoke useEffect)
        if (recordingStartedRef.current) {
            console.log('⚠️ startAutoRecording: already started, skipping duplicate');
            return;
        }
        recordingStartedRef.current = true;

        const success = await startMeetingRecording({
            localStreamRef,
            mediaRecorderRef,
            recordedChunksRef,
            setIsRecording,
            setRecordedBlob,
            remoteVideoRefs,
            screenStreamRef,
            micStreamRef,
            onRecordingStopped: () => {
                // Called when user stops screen share from browser UI
                recordingStartedRef.current = false;
            },
        });
        if (success) {
            setRecordingStartTime(Date.now());
            console.log('🔴 Recording started');

            // Save recording start to DB
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API_URL}/api/meeting-rooms/save-recording-start`,
                    {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            meeting_room_id: meetingId,
                            started_at: new Date().toISOString(),
                        }),
                    }
                );
                if (res.ok) {
                    const data = await res.json();
                    setRecordingId(data.meeting_id?.toString() || null);
                }
            } catch (e) {
                console.error('Failed to save recording start:', e);
            }
        } else {
            // Recording failed or user cancelled — reset guard
            recordingStartedRef.current = false;
        }
    };

    const startQuiz = (title?: string) => {
        const newSession: QuizSession = {
            id: Date.now().toString(),
            title: title || 'New Quiz Session',
            description: 'Quiz session started during meeting',
            questions: [],
            answers: [],
            isActive: true,
            startedAt: new Date(),
            settings: {
                shuffleQuestions: false,
                showResults: true,
                allowRetry: true,
                passingScore: 70,
                showLeaderboard: true
            },
            participants: participants.filter(p => !p.isBot).map(p => p.id)
        };

        setQuizSession(newSession);
        setActiveTab('quiz');
        toast.success(`Quiz session started: ${newSession.title}`);

        socketRef.current?.emit('quiz-started', { ...newSession, meetingId });
    };

    const endQuiz = () => {
        setQuizSession(prev => ({ ...prev, isActive: false }));
        updateLeaderboard({ quizSession, participants, setLeaderboard });
        updateQuizAnalytics({ quizSession, participants, setQuizAnalytics });
        toast.success('Quiz session ended');
        socketRef.current?.emit('quiz-ended', { quizId: quizSession.id, meetingId });
    };

    // Effects
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await fetch(`${API_URL}/api/auth/check`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data.valid && data.user_id) setUserId(data.user_id);
                } catch (error) {
                    console.error('Failed to get user ID:', error);
                }
            }

            await initializeMeeting({
                meetingId, router, setUserName, setUserEmail, setIsOwner, setMeeting,
                socketRef, localStreamRef, localVideoRef, isOwner, meeting,
                isRecording, setIsRecording, setIsVideoEnabled, setIsAudioEnabled,
                initialAudioEnabled: isAudioEnabled, initialVideoEnabled: isVideoEnabled,
                mediaRecorderRef, recordedChunksRef, setRecordedBlob,
                setJoinPayload
            });

            if (socketRef.current) {
                setSocketReady(true);   // lets the approval listeners attach

                setupSocketListeners({
                    socketRef, setParticipants, setChatMessages, setCaptions,
                    setQuizSession, setQuizAnalytics, setFloatingEmojis, setActiveReactions,
                    setMessageReactions, participants, meetingId, chatScrollRef,
                    setCurrentMood, setMoodIntensity, setMoodHistory, setMeetingInsights,
                    setFollowUpTasks, setLiveTranscript, setActiveTab
                });

                initializeSpeechRecognition({
                    recognitionRef, selectedLanguage, userName, socketRef, setCaptions,
                    isLiveTranslationEnabled, targetLanguage, meetingId, analyzeSentiment,
                    toast, setParticipants, setLiveTranscript, setSpeakingDistribution
                });

                if (socketRef.current) {
                    // This is now also handled inside setupSocketListeners for redundancy/reliability
                    socketRef.current.on('speaker-aware-transcript', (data: { entry: TranscriptEntry }) => {
                        setLiveTranscript(prev => [...prev, data.entry]);
                    });
                }

                // Check auto_record from meeting room API
                try {
                    const meetingRoomRes = await fetch(
                        `${API_URL}/api/meeting-rooms/${meetingId}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (meetingRoomRes.ok) {
                        const meetingRoomData = await meetingRoomRes.json();
                        const shouldAutoRecord = meetingRoomData?.meeting?.settings?.auto_record === true;
                        console.log('🎙️ autoRecord value from API:', shouldAutoRecord);
                        setAutoRecord(shouldAutoRecord);
                        if (shouldAutoRecord) {
                            // Show the recording prompt modal after 2s
                            setTimeout(() => setShowRecordingPrompt(true), 2000);
                        }
                    }
                } catch (e) {
                    console.error('Failed to fetch meeting room settings:', e);
                }
            }
        };

        init();

        return () => {
            cleanupResources({
                localStreamRef, remoteVideoRefs, recognitionRef, peersRef,
                audioContextRef, socketRef, controlsTimeoutRef, localVideoRef, animationFrameRef
            });
            if (socketRef.current) socketRef.current.off('speaker-aware-transcript');
        };
    }, [meetingId]);

    // Waiting room and approval socket listeners
    useEffect(() => {
        if (!socketRef.current) return;

        socketRef.current.on('waiting-approval', (data: any) => {
            setIsWaitingRoom(true);
            setIsAdmitted(false);
            toast(data.message || 'Waiting for host approval...');
        });

        // The server sends the whole pending queue, not one arrival at a time, so
        // a host who joins late (or reconnects) still sees everyone already waiting.
        socketRef.current.on('approval-requested', (data: any) => {
            const incoming: Array<{ userId: string; userName: string; userEmail?: string; requestedAt?: string }> =
                Array.isArray(data?.pending) ? data.pending : data?.userId ? [data] : [];

            setPendingUsers(prev => {
                const next = incoming.map(u => ({
                    userId: String(u.userId),
                    userName: u.userName,
                    userEmail: u.userEmail,
                    timestamp: u.requestedAt || new Date().toISOString(),
                }));
                const newcomers = next.filter(u => !prev.some(p => p.userId === u.userId));
                newcomers.forEach(u => toast(`${u.userName} is asking to join`, { icon: '🔔', duration: 6000 }));
                return next;
            });
        });

        socketRef.current.on('join-approved', (data: any) => {
            setIsWaitingRoom(false);
            setIsAdmitted(true);          // unblocks the LiveKit connection
            if (typeof data?.isHost === 'boolean') setIsOwner(data.isHost);
            toast.success(data?.isHost ? 'You are hosting this meeting' : 'You are in — connecting audio and video...');
        });

        socketRef.current.on('join-rejected', (data: any) => {
            setIsAdmitted(false);
            toast.error(data.message || 'Join request rejected');
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.off('waiting-approval');
                socketRef.current.off('approval-requested');
                socketRef.current.off('join-approved');
                socketRef.current.off('join-rejected');
            }
        };
    }, [socketReady]);

    // Announce ourselves only after the listeners above exist, so the server's
    // immediate `waiting-approval` / `join-approved` reply can never be missed.
    useEffect(() => {
        if (!socketReady || !joinPayload || !socketRef.current) return;
        socketRef.current.emit('join-meeting', joinPayload);
    }, [socketReady, joinPayload]);

    // Auto-insights: every 5 minutes, send accumulated transcript to /api/chat with mode: insights
    useEffect(() => {
        const interval = setInterval(async () => {
            if (liveTranscript.length < 10) return; // Need meaningful content

            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const transcriptText = liveTranscript
                    .map(t => `[${t.speaker}]: ${t.text}`)
                    .join('\n');

                const res = await fetch(`${API_URL}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ message: 'Extract insights', mode: 'insights', context: transcriptText })
                });

                if (!res.ok) return;
                const data = await res.json();
                const parsed = data.response;

                if (parsed?.insights?.length) {
                    const newInsights: MeetingInsight[] = parsed.insights.map((text: string, i: number) => ({
                        id: `auto-${Date.now()}-${i}`,
                        type: 'idea' as const,
                        text,
                        timestamp: new Date(),
                        participants: [],
                        priority: 'medium' as const,
                    }));
                    setMeetingInsights(prev => [...prev, ...newInsights]);
                }

                if (parsed?.action_items?.length) {
                    const newTasks: FollowUpTask[] = parsed.action_items.map((title: string, i: number) => ({
                        id: `auto-task-${Date.now()}-${i}`,
                        type: 'reminder' as const,
                        title,
                        description: `AI-generated from meeting transcript`,
                        assignedTo: [],
                        status: 'pending' as const,
                    }));
                    setFollowUpTasks(prev => [...prev, ...newTasks]);
                }

                console.log('🧠 Auto-insights fetched successfully');
            } catch (err) {
                console.error('Auto-insights fetch failed:', err);
            }
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(interval);
    }, [liveTranscript]);

    const handleApproveUser = (userIdToApprove: string) => {
        if (!socketRef.current || !userId) return;
        socketRef.current.emit('approve-join-request', { meetingId, userId: userIdToApprove, hostId: userId });
        setPendingUsers(prev => prev.filter(u => u.userId !== userIdToApprove));
        toast.success('User approved');
    };

    const handleRejectUser = (userIdToReject: string) => {
        if (!socketRef.current || !userId) return;
        socketRef.current.emit('reject-join-request', { meetingId, userId: userIdToReject, hostId: userId });
        setPendingUsers(prev => prev.filter(u => u.userId !== userIdToReject));
        toast('User rejected');
    };

    const handleWaitingRoomApproved = (meetingData: any) => {
        setIsWaitingRoom(false);
        setIsAdmitted(true);   // releases the LiveKit connection
        if (meetingData?.meeting) setMeeting(meetingData.meeting);
        if (meetingData?.participants) setParticipants(Object.values(meetingData.participants));
    };

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth < 1024) setIsSidebarOpen(false);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        const handleMouseMove = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('mousemove', handleMouseMove);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatMessages, activeTab, isSidebarOpen]);

    useEffect(() => {
        const interval = setInterval(() => {
            setParticipants(prev => prev.map(p => {
                if (p.isSpeaking) {
                    const speakingTime = (p.speakingTime || 0) + 1;
                    setSpeakingDistribution(prevDist => ({
                        ...prevDist,
                        [p.id]: (prevDist[p.id] || 0) + 1
                    }));
                    if (speakingTime > (speakingDistribution[dominantSpeaker] || 0)) setDominantSpeaker(p.id);
                    if (speakingTime % 30 === 0) {
                        const emotions = ['neutral', 'excited', 'concerned', 'confident'];
                        setEmotionData(prev => ({ ...prev, [p.id]: emotions[Math.floor(Math.random() * emotions.length)] }));
                    }
                    return { ...p, speakingTime };
                }
                return p;
            }));

            if (isAudioEnabled && Math.random() > 0.7) {
                setIsSpeaking(true);
                setTimeout(() => setIsSpeaking(false), 2000);
            }

            if (Math.random() < 0.05) detectPotentialConflict({ participants, setAgreementScore });
            if (Math.random() < 0.02) generateMeetingInsight({ participants, setMeetingInsights, extractTopic });
        }, 1000);
        return () => clearInterval(interval);
    }, [isAudioEnabled]);

    useEffect(() => {
        if (captions.length > 0 && isAIEnabled) {
            const lastCaption = captions[captions.length - 1];
            analyzeCaption(lastCaption);
            storeCaptionForReplay(lastCaption);
        }
    }, [captions]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (quizTimer !== null && quizTimer > 0) {
            interval = setInterval(() => {
                setQuizTimer(prev => (prev && prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [quizTimer]);

    useEffect(() => {
        updateLeaderboard({ quizSession, participants, setLeaderboard });
        updateQuizAnalytics({ quizSession, participants, setQuizAnalytics });
    }, [quizSession.answers]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            const isFocused = !document.hidden;
            if (socketRef.current) {
                socketRef.current.emit('user-focus-change', { meetingId, userId: getCurrentUserId(), userName, isFocused });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        if (socketRef.current && isOwner) {
            socketRef.current.on('user-focus-change', (data: { userId: string, userName: string, isFocused: boolean }) => {
                if (data.userId !== getCurrentUserId() && !data.isFocused) {
                    const notification = {
                        id: `${data.userId}-${Date.now()}`,
                        userId: data.userId,
                        userName: data.userName,
                        isFocused: data.isFocused,
                        timestamp: new Date()
                    };
                    setFocusNotifications(prev => [...prev.slice(-4), notification]);
                    setTimeout(() => {
                        setFocusNotifications(prev => prev.filter(n => n.id !== notification.id));
                    }, 10000);
                }
            });
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (socketRef.current) socketRef.current.off('user-focus-change');
        };
    }, [meetingId, userName, isOwner]);

    // Helper functions
    const analyzeCaption = (caption: Caption) => {
        if (!isAIEnabled) return;
        const text = caption.text.toLowerCase();

        if (text.startsWith('/')) {
            handleCommand(text, caption.userName, {
                isRecording,
                toggleRecording: () => toggleRecordingUtil({
                    isRecording, setIsRecording, localStreamRef, mediaRecorderRef,
                    recordedChunksRef, setRecordedBlob, toast, participants, participantsRef,
                    localVideoRef, remoteVideoRefs, animationFrameRef, audioContextRef
                }),
                setTargetLanguage, setIsLiveTranslationEnabled,
                generateMeetingSummary: () => generateMeetingSummary(participants, currentMood, moodIntensity, agreementScore, meetingInsights, sendChatMessage),
                handleNextSpeaker: () => handleNextSpeakerUtil(participants, sendChatMessage),
                showDecisions: () => showDecisions(meetingInsights, sendChatMessage),
                startQuiz, endQuiz,
                muteAllParticipants: () => muteAllParticipants(participants, isOwner, toast),
                setChatMessages,
                highlightMessage: (searchText: string) => highlightMessage(searchText, chatMessages, sendChatMessage),
                setShowCommandHelp, setCommands, participants, isOwner
            });
            return;
        }

        if (text.includes('no but') || text.includes('that\'s wrong') || text.includes('i disagree')) {
            handleArgumentDetection(caption, { setDetectedConflicts, addAIMessage, aiMode, extractTopic });
        }
        if (text.includes('i don\'t understand') || text.includes('confused') || text.includes('what do you mean')) {
            handleConfusionDetection(caption, { addAIMessage, aiMode, setAgreementScore, extractKeywords });
        }
        if (text.includes('need to') || text.includes('should') || text.includes('task') || text.includes('action')) {
            handleTaskDetection(caption, {
                setMeetingInsights,
                createFollowUpTask: (type: any, title: string, assignedTo: string[]) => createFollowUpTask(type, title, assignedTo, {
                    setFollowUpTasks,
                    executeFollowUpTask: (task: any) => executeFollowUpTaskUtil(task, { setFollowUpTasks, sendChatMessage })
                }),
                addAIMessage, aiMode, extractTask, sendChatMessage
            });
        }
        if (text.includes('?') || text.startsWith('how') || text.startsWith('what') || text.startsWith('why')) {
            handleQuestionDetection(caption, { setMeetingInsights });
        }
    };

    const storeCaptionForReplay = (caption: Caption) => {
        const replay: GhostReplay = {
            id: Date.now().toString(),
            userId: caption.userId,
            userName: caption.userName,
            text: caption.text,
            timestamp: new Date(),
            context: extractTopic(caption.text),
            isPlaying: false
        };
        setGhostReplays(prev => [...prev.slice(-19), replay]);
    };

    const onToggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
        if (!isSidebarOpen) setActiveTab('chat');
    };

    // Held in the lobby: show the waiting room instead of an empty meeting.
    // The LiveKit connection stays gated until the host admits us.
    if (isWaitingRoom) {
        return (
            <div className="theme-dark dark min-h-screen">
                <WaitingRoom
                    meetingId={meetingId}
                    socket={socketRef.current}
                    onApproved={handleWaitingRoomApproved}
                />
            </div>
        );
    }

    return (
        <div id="meeting-container" className="theme-dark dark relative h-screen w-full bg-background overflow-hidden text-foreground">
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, { setSelectedImage, sendChatMessage, addAIMessage, userName, toast })}
            />


            {/* Join requests — only the host can act on these. */}
            {isOwner && (
                <ApprovalNotification
                    pendingUsers={pendingUsers}
                    onApprove={handleApproveUser}
                    onReject={handleRejectUser}
                />
            )}

            {/* Floating Emojis */}
            <FloatingEmojis floatingEmojis={floatingEmojis} />

            {/* Main Content Area */}
            <div className={`relative h-full transition-all duration-500 ease-in-out ${isSidebarOpen && !isMobile ? 'mr-96' : 'mr-0'}`}>

                {!isScreenSharing && !participants.some(p => p.isScreenSharing) && (
                    <MeetingHeader
                        meetingId={meetingId}
                        currentMood={currentMood}
                        moodIntensity={moodIntensity}
                        onCopyMeetingLink={() => copyMeetingLink(meetingId)}
                    />
                )}

                <VideoGrid
                    participants={participants}
                    userName={userName}
                    isVideoEnabled={isVideoEnabled}
                    isAudioEnabled={isAudioEnabled}
                    localStreamRef={localStreamRef}
                    localVideoRef={localVideoRef}
                    isScreenSharing={isScreenSharing}
                    isOwner={isOwner}
                    isSpeaking={isSpeaking}
                    dominantSpeaker={dominantSpeaker}
                    isHandRaised={isHandRaised}
                    onStopScreenShare={async () => {
                        await stopScreenShare();
                        setIsScreenSharing(false);
                        socketRef.current?.emit('screen-share-stop', {
                            meetingId, userId: getCurrentUserId()
                        });
                    }}
                    remoteVideoRefs={remoteVideoRefs}
                    remoteStreams={remoteStreams}
                    remoteScreenStreams={screenStreams}
                />

                {/* Remote audio lives outside the tiles so a participant with
                    their camera off is still audible. */}
                <RemoteAudioSink streams={remoteStreams} room={liveKitRoom} />

                <CaptionsOverlay
                    isCaptionsEnabled={isCaptionsEnabled}
                    captions={captions}
                    aiInsights={aiInsights}
                    aiMode={aiMode}
                />

                <MeetingControls
                    showControls={showControls}
                    isAudioEnabled={isAudioEnabled}
                    isVideoEnabled={isVideoEnabled}
                    isScreenSharing={isScreenSharing}
                    isHandRaised={isHandRaised}
                    isAIEnabled={isAIEnabled}
                    isRecording={isRecording}
                    isOwner={isOwner}
                    selectedLanguage={selectedLanguage}
                    targetLanguage={targetLanguage}
                    isLiveTranslationEnabled={isLiveTranslationEnabled}
                    isCaptionsEnabled={isCaptionsEnabled}
                    aiMode={aiMode}
                    aiSensitivity={aiSensitivity}
                    activeTab={activeTab}
                    isSidebarOpen={isSidebarOpen}
                    onToggleAudio={async () => {
                        // Mute at the publisher, not just the local track — otherwise
                        // audio keeps reaching the SFU and everyone still hears you.
                        const next = !isAudioEnabled;
                        setIsAudioEnabled(next);
                        await setMicEnabled(next);
                        socketRef.current?.emit('audio-toggle', {
                            meetingId, userId: getCurrentUserId(), enabled: next
                        });
                    }}
                    onToggleVideo={async () => {
                        const next = !isVideoEnabled;
                        setIsVideoEnabled(next);
                        await setCameraEnabled(next);
                        socketRef.current?.emit('video-toggle', {
                            meetingId, userId: getCurrentUserId(), enabled: next
                        });
                    }}
                    onToggleScreenShare={async () => {
                        if (isScreenSharing) {
                            await stopScreenShare();
                            setIsScreenSharing(false);
                            socketRef.current?.emit('screen-share-stop', {
                                meetingId, userId: getCurrentUserId()
                            });
                            return;
                        }
                        const started = await startScreenShare();
                        if (!started) return;   // user dismissed the picker
                        setIsScreenSharing(true);
                        socketRef.current?.emit('screen-share-start', {
                            meetingId, userId: getCurrentUserId()
                        });
                    }}
                    onToggleHand={() => toggleHand({ isHandRaised, setIsHandRaised, socketRef, meetingId, getCurrentUserId, toast })}
                    onToggleRecording={() => {
                        if (!isRecording) {
                            // Show our custom prompt modal (getDisplayMedia fires from there)
                            setShowRecordingPrompt(true);
                        } else {
                            // Stop recording
                            stopMeetingRecording({
                                mediaRecorderRef,
                                audioRecorderRef,
                                screenStreamRef,
                                micStreamRef,
                                setIsRecording,
                            });
                            recordingStartedRef.current = false;
                            toast.success('⏹️ Recording stopped');
                        }
                    }}
                    onLeaveMeeting={handleLeaveMeeting}
                    autoRecord={autoRecord}
                    onToggleSidebar={onToggleSidebar}
                    onSendReaction={(emoji) => sendReaction({
                        emoji, setFloatingEmojis, setActiveReactions, socketRef, meetingId, getCurrentUserId, toast
                    })}
                    onStartVoiceRecording={() => startVoiceRecording({
                        setIsRecordingVoice, setVoiceRecording, sendChatMessage, userName, toast
                    })}
                    onSetAIEnabled={setIsAIEnabled}
                    onSetAiMode={setAiMode}
                    onSetAiSensitivity={setAiSensitivity}
                    onSetSelectedLanguage={setSelectedLanguage}
                    onSetTargetLanguage={setTargetLanguage}
                    onSetLiveTranslationEnabled={setIsLiveTranslationEnabled}
                    onSetCaptionsEnabled={setIsCaptionsEnabled}
                    onOpenAIChat={() => setIsAIChatOpen(true)}
                    onOpenNewQuestionForm={() => setShowNewQuestionForm(true)}
                    onSetActiveTab={(tab: any) => setActiveTab(tab)}
                    socketRef={socketRef}
                    meetingId={meetingId}
                />
            </div>

            {/* Sidebar */}
            <Sidebar
                isSidebarOpen={isSidebarOpen}
                activeTab={activeTab}
                setActiveTab={handleSidebarTabChange}
                participants={participants}
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleChatSubmit={handleChatSubmit}
                aiMessages={aiMessages}
                aiChatInput={aiChatInput}
                setAiChatInput={setAiChatInput}
                sendAIChatMessage={sendAIChatMessage}
                ghostReplays={ghostReplays}
                requestGhostReplay={(query) => requestGhostReplay(query, {
                    ghostReplays, addAIMessage, isAIEnabled, setGhostReplays, setActiveGhostReplay
                })}
                activeGhostReplay={activeGhostReplay}
                isOwner={isOwner}
                userName={userName}
                quizSession={quizSession}
                currentQuestion={currentQuestion}
                currentAnswer={currentAnswer}
                setCurrentAnswer={setCurrentAnswer}
                submitQuizAnswer={submitQuizAnswer}
                quizTimer={quizTimer}
                participantsData={participants}
                emotionData={emotionData}
                activeReactions={activeReactions}
                followUpTasks={followUpTasks}
                meetingInsights={meetingInsights}
                speakingDistribution={speakingDistribution}
                dominantSpeaker={dominantSpeaker}
                chatScrollRef={chatScrollRef}
                messageReactions={messageReactions}
                sendMessageReaction={(messageId, emoji) => sendMessageReaction(messageId, emoji, {
                    setMessageReactions, socketRef, meetingId
                })}
                pinnedMessage={pinnedMessage}
                setPinnedMessage={setPinnedMessage}
                liveTranscript={liveTranscript}
                onOpenNewQuestionForm={() => setShowNewQuestionForm(true)}
                isAudioEnabled={isAudioEnabled}
                isScreenSharing={isScreenSharing}
                isMobile={isMobile}
                unreadCounts={unreadCounts}
                onTabClick={handleTabClick}
                socketRef={socketRef}
                meetingId={meetingId}
            />

            {/* Modals */}
            <AIChatModal
                isOpen={isAIChatOpen}
                onClose={() => setIsAIChatOpen(false)}
                aiMessages={aiMessages}
                aiChatInput={aiChatInput}
                setAiChatInput={setAiChatInput}
                sendAIChatMessage={sendAIChatMessage}
                ghostReplays={ghostReplays}
                requestGhostReplay={(query) => requestGhostReplay(query, {
                    ghostReplays, addAIMessage, isAIEnabled, setGhostReplays, setActiveGhostReplay
                })}
                activeGhostReplay={activeGhostReplay}
                chatMode={chatMode}
                setChatMode={setChatMode}
                isRecordingVoice={isRecordingVoice}
                startVoiceRecording={() => startVoiceRecording({
                    setIsRecordingVoice, setVoiceRecording, sendChatMessage, userName, toast
                })}
                fileInputRef={fileInputRef}
            />

            <NewQuestionModal
                isOpen={showNewQuestionForm}
                onClose={() => setShowNewQuestionForm(false)}
                newQuizQuestion={newQuizQuestion}
                setNewQuizQuestion={setNewQuizQuestion}
                sendQuizQuestion={sendQuizQuestion}
                aiTopic={aiTopic}
                setAiTopic={setAiTopic}
                aiDifficulty={aiDifficulty}
                setAiDifficulty={setAiDifficulty}
                isGeneratingAIQuestion={isGeneratingAIQuestion}
                generateAIQuestion={generateAIQuestion}
                aiGeneratedQuestions={aiGeneratedQuestions}
                setShowNewQuestionForm={setShowNewQuestionForm}
            />

            <AnswerDetailsModal
                isOpen={showAnswerPopup}
                onClose={() => setShowAnswerPopup(false)}
                selectedAnswer={selectedAnswer}
                quizSession={quizSession}
                participants={participants}
                setSelectedUserForPrivateQuestion={setSelectedUserForPrivateQuestion}
                setShowNewQuestionForm={setShowNewQuestionForm}
                setShowAnswerPopup={setShowAnswerPopup}
            />

            <RecordingPromptModal
                isOpen={showRecordingPrompt}
                onCancel={() => setShowRecordingPrompt(false)}
                onStartRecording={async () => {
                    setShowRecordingPrompt(false);

                    // Guard
                    if (recordingStartedRef.current) return;
                    recordingStartedRef.current = true;

                    // getDisplayMedia — called directly from button click (user gesture preserved)
                    let screenStream: MediaStream;
                    try {
                        screenStream = await navigator.mediaDevices.getDisplayMedia({
                            video: { frameRate: { ideal: 30 } },
                            audio: true,
                        });
                    } catch (err: any) {
                        console.log('ℹ️ User cancelled screen share dialog');
                        recordingStartedRef.current = false;
                        return;
                    }

                    // Auto-minimize browser share toolbar by focusing away
                    setTimeout(() => {
                        const meetingContainer = document.getElementById('meeting-container');
                        if (meetingContainer) meetingContainer.focus();
                        if (document.activeElement) {
                            (document.activeElement as HTMLElement).blur();
                        }
                    }, 500);

                    let micStream: MediaStream | null = null;
                    try {
                        // Capture reliable mic audio specifically for transcription
                        micStream = await navigator.mediaDevices.getUserMedia({
                            audio: {
                                echoCancellation: true,
                                noiseSuppression: true,
                                sampleRate: 44100
                            },
                            video: false
                        });

                        const audioTracks = micStream.getAudioTracks();
                        if (audioTracks.length === 0) {
                            console.error('No microphone audio tracks available');
                        } else {
                            console.log('🎤 Audio tracks captured:', audioTracks.length, audioTracks[0].label);
                        }
                    } catch (e) {
                        console.warn('⚠️ Could not get mic, recording screen audio only');
                    }

                    // --- 1. VIDEO RECORDER (Screen + Mic for preview) ---
                    const videoTracks = screenStream.getVideoTracks();
                    const screenAudioTracks = screenStream.getAudioTracks();
                    const micAudioTracks = micStream ? micStream.getAudioTracks() : [];

                    const allTracks = [
                        ...videoTracks,
                        ...screenAudioTracks,
                        ...micAudioTracks,
                    ];
                    const recordingStream = new MediaStream(allTracks);

                    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
                        ? 'video/webm;codecs=vp9,opus'
                        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
                            ? 'video/webm;codecs=vp8,opus'
                            : 'video/webm';

                    const mediaRecorder = new MediaRecorder(recordingStream, { mimeType });
                    recordedChunksRef.current = [];

                    mediaRecorder.ondataavailable = (e) => {
                        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
                    };
                    mediaRecorder.onstop = () => {
                        if (recordedChunksRef.current.length > 0) {
                            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                            setRecordedBlob(blob);
                            console.log(`📦 Video blob ready: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
                        }
                    };

                    // --- 2. AUDIO RECORDER (Mic only for AssemblyAI) ---
                    let audioRecorder: MediaRecorder | null = null;
                    if (micStream && micAudioTracks.length > 0) {
                        const audioRecordingStream = new MediaStream([...micAudioTracks]);
                        const audioMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                            ? 'audio/webm;codecs=opus'
                            : 'audio/webm';

                        audioRecorder = new MediaRecorder(audioRecordingStream, { mimeType: audioMimeType });
                        audioRecordedChunksRef.current = [];

                        audioRecorder.ondataavailable = (e) => {
                            if (e.data && e.data.size > 0) audioRecordedChunksRef.current.push(e.data);
                        };
                        audioRecorder.onstop = () => {
                            console.log(`📦 Audio chunks ready: ${audioRecordedChunksRef.current.length}`);
                        };
                    }

                    // Handle premature stop
                    screenStream.getVideoTracks()[0].onended = () => {
                        console.log('🛑 User stopped screen share');
                        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
                        if (audioRecorder && audioRecorder.state === 'recording') audioRecorder.stop();
                        screenStream.getTracks().forEach(t => t.stop());
                        micStream?.getTracks().forEach(t => t.stop());
                        setIsRecording(false);
                        recordingStartedRef.current = false;
                    };

                    // Save refs
                    screenStreamRef.current = screenStream;
                    micStreamRef.current = micStream;
                    mediaRecorderRef.current = mediaRecorder;
                    audioRecorderRef.current = audioRecorder;

                    // Start both
                    mediaRecorder.start(1000);
                    if (audioRecorder) audioRecorder.start(1000);
                    setIsRecording(true);
                    setRecordingStartTime(Date.now());
                    toast.success('🔴 Recording started');

                    try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(
                            `${API_URL}/api/meeting-rooms/save-recording-start`,
                            {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ meeting_room_id: meetingId, started_at: new Date().toISOString() }),
                            }
                        );
                        if (res.ok) {
                            const data = await res.json();
                            setRecordingId(data.meeting_id?.toString() || null);
                        }
                    } catch (e) {
                        console.error('Failed to save recording start:', e);
                    }
                }}
            />

            <AnalyticsModal
                isOpen={showAnalytics}
                onClose={() => setShowAnalytics(false)}
                quizAnalytics={quizAnalytics}
                quizSession={quizSession}
                participants={participants}
            />

            <PostMeetingModal
                isOpen={showPostMeetingPopup}
                onClose={() => setShowPostMeetingPopup(false)}
                onUpload={handleProcessRecording}
                onDiscard={handleDiscardRecording}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                uploadError={uploadError}
                meetingId={meetingId}
                title={popupTitle}
                setTitle={setPopupTitle}
                language={popupLanguage}
                setLanguage={setPopupLanguage}
                languages={languages}
            />


            {/* REC indicator when recording is active */}
            {isRecording && (
                <div className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-red-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm font-medium shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    REC
                </div>
            )}

            {/* Focus Notifications (Host Only) */}
            {isOwner && <FocusNotification notifications={focusNotifications} />}
        </div>
    );
};

export default MeetingPage;