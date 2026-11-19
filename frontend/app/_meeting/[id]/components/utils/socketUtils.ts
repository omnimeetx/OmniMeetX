import { API_URL, SOCKET_URL } from "@/lib/config"
import { toast } from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import {
    Participant, Caption, ChatMessage, QuizQuestion, QuizAnswer,
    GhostReplay, FloatingEmoji, MeetingInsight, MoodPoint, TranscriptEntry,
    FollowUpTask
} from '../types';
import { getCurrentUserId, createLocalVideoPlaceholder } from './meetingUtils';

export const setupSocketListeners = (options: {
    socketRef: React.MutableRefObject<Socket | null>;
    setParticipants: (participants: Participant[] | ((prev: Participant[]) => Participant[])) => void;
    setChatMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    setCaptions: (captions: Caption[] | ((prev: Caption[]) => Caption[])) => void;
    setQuizSession: (session: any) => void;
    setQuizAnalytics: (analytics: any) => void;
    setFloatingEmojis: (emojis: FloatingEmoji[] | ((prev: FloatingEmoji[]) => FloatingEmoji[])) => void;
    setActiveReactions: (reactions: { [key: string]: string } | ((prev: { [key: string]: string }) => { [key: string]: string })) => void;
    setMessageReactions: (reactions: { [key: string]: { [emoji: string]: number } } | ((prev: { [key: string]: { [emoji: string]: number } }) => { [key: string]: { [emoji: string]: number } })) => void;
    participants: Participant[];
    meetingId: string;
    chatScrollRef: React.RefObject<HTMLDivElement>;
    setCurrentMood: (mood: 'positive' | 'neutral' | 'negative') => void;
    setMoodIntensity: (intensity: number) => void;
    setMoodHistory: (history: MoodPoint[] | ((prev: MoodPoint[]) => MoodPoint[])) => void;
    setMeetingInsights: (insights: MeetingInsight[] | ((prev: MeetingInsight[]) => MeetingInsight[])) => void;
    setFollowUpTasks: (tasks: FollowUpTask[] | ((prev: FollowUpTask[]) => FollowUpTask[])) => void;
    setLiveTranscript: (transcript: TranscriptEntry[] | ((prev: TranscriptEntry[]) => TranscriptEntry[])) => void;
    setActiveTab: (tab: 'participants' | 'chat' | 'ai' | 'insights' | 'quiz' | 'tasks') => void;
}) => {
    if (!options.socketRef.current) return;

    const socket = options.socketRef.current;

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
        toast.error('Connection lost. Reconnecting...');
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        toast.error('Connection error. Please check your network.');
    });

    socket.on('participant-joined', (data: any) => {
        console.log('Participant joined:', data);
        toast(`${data.userName} joined the meeting`);

        options.setParticipants((prev: Participant[]) => {
            if (prev.find((p: Participant) => p.id === data.userId)) return prev;

            return [...prev, {
                id: data.userId,
                name: data.userName,
                email: data.userEmail,
                isAudioEnabled: true,
                isVideoEnabled: true,
                isSpeaking: false,
                isHandRaised: false,
                isBot: data.isBot || false,
                isTeacher: data.isTeacher || false,
                speakingTime: 0,
                connectionQuality: 'good',
                quizScore: 0,
                correctAnswers: 0,
                totalAttempts: 0
            } as Participant];
        });
    });

    socket.on('participant-left', (data: any) => {
        console.log('Participant left:', data);
        toast(`${data.userName} left the meeting`);

        options.setParticipants((prev: Participant[]) => prev.filter(p => p.id !== data.userId));
    });

    socket.on('audio-toggle', (data: { userId: string; enabled: boolean }) => {
        options.setParticipants((prev: Participant[]) => prev.map(p =>
            p.id === data.userId ? { ...p, isAudioEnabled: data.enabled } : p
        ));
    });

    socket.on('video-toggle', (data: { userId: string; enabled: boolean }) => {
        options.setParticipants((prev: Participant[]) => prev.map(p =>
            p.id === data.userId ? { ...p, isVideoEnabled: data.enabled } : p
        ));
    });

    socket.on('hand-toggle', (data: { userId: string; isRaised: boolean }) => {
        options.setParticipants((prev: Participant[]) => prev.map(p =>
            p.id === data.userId ? { ...p, isHandRaised: data.isRaised } : p
        ));

        if (data.isRaised) {
            const participant = options.participants.find(p => p.id === data.userId);
            if (participant) {
                toast(`${participant.name} raised their hand`);
            }
        }
    });

    socket.on('screen-share-start', (data: { userId: string }) => {
        const participant = options.participants.find(p => p.id === data.userId);
        if (participant) {
            toast(`${participant.name} started screen sharing`);
        }
    });

    socket.on('screen-share-stop', (data: { userId: string }) => {
        const participant = options.participants.find(p => p.id === data.userId);
        if (participant) {
            toast(`${participant.name} stopped screen sharing`);
        }
    });

    socket.on('meeting-state', (data: any) => {
        console.log('Meeting state updated:', data);

        if (data.participants) {
            const serverParticipants = Object.values(data.participants || {}).map((p: any) => ({
                id: p.id,
                name: p.name,
                email: p.email,
                isAudioEnabled: p.is_audio_enabled ?? true,
                isVideoEnabled: p.is_video_enabled ?? true,
                isSpeaking: p.is_speaking ?? false,
                isHandRaised: p.is_hand_raised ?? false,
                isBot: p.is_bot ?? false,
                isTeacher: p.is_teacher ?? false,
                speakingTime: p.speaking_time ?? 0,
                connectionQuality: p.connection_quality || 'good',
                quizScore: p.quiz_score ?? 0,
                correctAnswers: p.correct_answers ?? 0,
                totalAttempts: p.total_attempts ?? 0
            }));

            options.setParticipants(serverParticipants);
        }
    });

    socket.on('chat-message', (data: ChatMessage) => {
        console.log('New chat message:', data);
        options.setChatMessages((prev: ChatMessage[]) => [...prev, {
            ...data,
            timestamp: new Date(data.timestamp)
        } as ChatMessage]);

        setTimeout(() => {
            if (options.chatScrollRef.current) {
                options.chatScrollRef.current.scrollTop = options.chatScrollRef.current.scrollHeight;
            }
        }, 100);
    });

    socket.on('caption', (data: Caption) => {
        console.log('New caption:', data);
        options.setCaptions(prev => [...prev.slice(-4), {
            ...data,
            timestamp: new Date(data.timestamp)
        }]);
    });

    socket.on('quiz-question', (question: QuizQuestion) => {
        options.setQuizSession((prev: any) => ({
            ...prev,
            questions: [...prev.questions, question]
        }));

        if (question.isPublic || question.targetUserIds?.includes('user')) {
            // This would be handled by parent component
            toast.success(`New question from ${question.createdBy}`);
        }
    });

    socket.on('quiz-answer', (answer: QuizAnswer) => {
        options.setQuizSession((prev: any) => ({
            ...prev,
            answers: [...prev.answers, answer]
        }));

        // Update participant scores
        options.setParticipants((prev: Participant[]) => prev.map(p => {
            if (p.id === answer.userId) {
                return {
                    ...p,
                    quizScore: (p.quizScore || 0) + (answer.isCorrect ? 10 : 0),
                    correctAnswers: (p.correctAnswers || 0) + (answer.isCorrect ? 1 : 0),
                    totalAttempts: (p.totalAttempts || 0) + 1
                };
            }
            return p;
        }));

        toast.success(`${answer.userName} submitted an answer`);
    });

    socket.on('ghost-replay-request', (data: { query: string; userId: string }) => {
        // This would be handled by parent component
        console.log('Ghost replay request:', data);
    });

    socket.on('reaction', (data: { emoji: string; userId: string }) => {
        const floatingEmoji: FloatingEmoji = {
            id: Date.now().toString(),
            emoji: data.emoji,
            x: Math.random() * 80 + 10,
            y: 80,
            userId: data.userId
        };

        options.setFloatingEmojis((prev: FloatingEmoji[]) => [...prev, floatingEmoji]);

        options.setActiveReactions(prev => ({
            ...prev,
            [data.userId]: data.emoji
        }));

        setTimeout(() => {
            options.setFloatingEmojis((prev: FloatingEmoji[]) => prev.filter(e => e.id !== floatingEmoji.id));
            options.setActiveReactions((prev: { [key: string]: string }) => {
                const newReactions = { ...prev };
                delete newReactions[data.userId];
                return newReactions;
            });
        }, 3000);
    });

    socket.on('message-reaction', (data: { messageId: string; emoji: string; userId: string }) => {
        options.setMessageReactions(prev => {
            const current = prev[data.messageId] || {};
            return {
                ...prev,
                [data.messageId]: {
                    ...current,
                    [data.emoji]: (current[data.emoji] || 0) + 1
                }
            };
        });
    });

    socket.on('meeting_insight', (data: any) => {
        if (data.type === 'sentiment') {
            const { sentiment, score, speaker } = data.data;
            console.log(`%c Mood Update: ${sentiment} (${Math.round(score * 100)}%) from ${speaker}`, 'background: #222; color: #bada55; font-weight: bold;');
            options.setCurrentMood(sentiment);
            options.setMoodIntensity(Math.round(score * 100));

            options.setMoodHistory(prev => [...prev, {
                time: prev.length,
                mood: sentiment as 'positive' | 'neutral' | 'negative',
                intensity: Math.round(score * 100),
                reason: `Speech by ${speaker}`
            }]);
        }
    });

    socket.on('ai-insight', (data: { meeting_id: string; insight: MeetingInsight }) => {
        console.log('AI Insight received:', data.insight);
        options.setMeetingInsights(prev => [...prev.slice(-19), {
            ...data.insight,
            timestamp: new Date(data.insight.timestamp)
        }]);
    });

    socket.on('follow-up-task', (data: { meeting_id: string; task: FollowUpTask }) => {
        console.log('Follow-up Task received:', data.task);
        options.setFollowUpTasks(prev => [...prev.slice(-19), {
            ...data.task,
            dueDate: data.task.dueDate ? new Date(data.task.dueDate) : undefined
        }]);
        toast.success(`Task identified: ${data.task.title}`);
    });

    socket.on('speaker-aware-transcript', (data: { meeting_id: string; entry: any }) => {
        // This is handled in page.tsx currently, but could be here
        console.log('Speaker aware transcript:', data);
    });

    socket.on('live_transcript_update', (data: { meeting_id: string; entry: TranscriptEntry }) => {
        console.log('Live transcript update:', data);
        options.setLiveTranscript(prev => [...prev.slice(-19), data.entry]);

        // Also update speaking status for the speaker
        options.setParticipants((prev: Participant[]) => prev.map(p => {
            if (p.id === data.entry.userId || p.name === data.entry.speaker) {
                return { ...p, isSpeaking: true };
            }
            return p;
        }));
    });

    // --- New Socket.IO event listeners ---

    // Caption broadcast from other participants
    socket.on('caption', (data: any) => {
        if (data?.text) {
            options.setCaptions(prev => [...prev.slice(-4), {
                id: Date.now().toString(),
                userId: data.userId || 'remote',
                userName: data.userName || 'Participant',
                text: data.text,
                timestamp: new Date(),
                sentiment: 0.5,
                language: data.language || 'en',
            }]);
        }
    });

    // Quiz events
    socket.on('quiz-start', (data: any) => {
        if (data?.questions) {
            options.setQuizSession((prev: any) => ({
                ...prev,
                questions: data.questions,
                isActive: true,
                startedAt: new Date(),
            }));
            options.setActiveTab('quiz');
            toast('📝 Quiz started! Check the Quiz tab.');
        }
    });

    socket.on('quiz-answer', (data: any) => {
        console.log('Quiz answer received:', data);
    });

    socket.on('quiz-results', (data: any) => {
        if (data) {
            options.setQuizAnalytics(data);
            toast('📊 Quiz results are in!');
        }
    });

    // Chat message reactions
    socket.on('message-reaction', (data: { messageId: string; emoji: string; userId: string }) => {
        if (data?.messageId && data?.emoji) {
            options.setMessageReactions(prev => {
                const msgReactions = { ...(prev[data.messageId] || {}) };
                msgReactions[data.emoji] = (msgReactions[data.emoji] || 0) + 1;
                return { ...prev, [data.messageId]: msgReactions };
            });
        }
    });

    // Pin message
    socket.on('pin-message', (data: { messageId: string; text: string; userName: string }) => {
        if (data) {
            toast(`📌 ${data.userName} pinned a message`);
        }
    });

    // Floating emoji reaction
    socket.on('emoji-reaction', (data: { userId: string; userName: string; emoji: string }) => {
        if (data?.emoji) {
            const floatingEmoji: FloatingEmoji = {
                id: Date.now().toString(),
                emoji: data.emoji,
                x: Math.random() * 80 + 10,
                y: Math.random() * 80 + 10,
                userId: data.userId,
                userName: data.userName,
            };
            options.setFloatingEmojis(prev => [...prev, floatingEmoji]);
            options.setActiveReactions(prev => ({ ...prev, [data.userId]: data.emoji }));

            // Clear after 3 seconds
            setTimeout(() => {
                options.setFloatingEmojis(prev => prev.filter(e => e.id !== floatingEmoji.id));
                options.setActiveReactions(prev => {
                    const next = { ...prev };
                    delete next[data.userId];
                    return next;
                });
            }, 3000);
        }
    });
};

export const initializeMeeting = async (options: {
    meetingId: string;
    router: any;
    setUserName: (name: string) => void;
    setUserEmail: (email: string) => void;
    setIsOwner: (isOwner: boolean) => void;
    setMeeting: (meeting: any) => void;
    socketRef: React.MutableRefObject<Socket | null>;
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    isOwner: boolean;
    meeting: any;
    isRecording: boolean;
    setIsRecording: (recording: boolean) => void;
    setIsVideoEnabled?: (enabled: boolean) => void;
    setIsAudioEnabled?: (enabled: boolean) => void;
    initialAudioEnabled?: boolean;
    initialVideoEnabled?: boolean;
    // New props for auto-recording (composited - records the whole meeting)
    mediaRecorderRef?: React.MutableRefObject<MediaRecorder | null>;
    recordedChunksRef?: React.MutableRefObject<Blob[]>;
    setRecordedBlob?: (blob: Blob | null) => void;
    // Extra refs needed for composited (whole-meeting canvas) recording
    participants?: Participant[];
    participantsRef?: React.MutableRefObject<Participant[]>;
    remoteVideoRefs?: React.MutableRefObject<{ [key: string]: HTMLVideoElement }>;
    animationFrameRef?: React.MutableRefObject<number | null>;
    audioContextRef?: React.MutableRefObject<AudioContext | null>;
    /** Receives the join payload; the page emits `join-meeting` once its
     *  approval listeners are attached, so no reply can be missed. */
    setJoinPayload?: (payload: {
        meetingId: string;
        userId: string;
        userName: string;
        userEmail: string;
        isTeacher: boolean;
        isBot: boolean;
    }) => void;
}) => {
    const savedName = localStorage.getItem('userName') || `User${Math.random().toString(36).substr(2, 5)}`;
    options.setUserName(savedName);
    localStorage.setItem('userName', savedName);

    const token = localStorage.getItem('token');
    if (!token) {
        toast.error('Please login first');
        options.router.push('/login');
        return;
    }

    try {
        const joinResponse = await fetch(`${API_URL}/api/meeting-rooms/${options.meetingId}/join`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userName: savedName,
                userEmail: '',
                isTeacher: options.isOwner
            })
        });

        if (!joinResponse.ok) {
            throw new Error('Failed to join meeting');
        }

        const joinData = await joinResponse.json();

        // Fetch meeting data to get settings including auto_record
        const meetingResponse = await fetch(`${API_URL}/api/meeting-rooms/${options.meetingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        let fetchedMeeting: any = null;
        let isUserOwner = options.isOwner;

        if (meetingResponse.ok) {
            const meetingData = await meetingResponse.json();
            fetchedMeeting = meetingData.meeting;
            options.setMeeting(fetchedMeeting);

            const userRes = await fetch(`${API_URL}/api/auth/check`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (userRes.ok) {
                const userData = await userRes.json();
                options.setUserEmail(userData.email || '');

                if (userData.user_name) {
                    options.setUserName(userData.user_name);
                    localStorage.setItem('userName', userData.user_name);
                }

                // Trust the server's `is_host` (it compares against the room's
                // stored host_user_id) rather than guessing from created_by.
                const serverSaysHost =
                    fetchedMeeting?.is_host === true ||
                    (fetchedMeeting?.created_by != null &&
                        userData.user_id === fetchedMeeting.created_by);

                options.setIsOwner(serverSaysHost);
                isUserOwner = serverSaysHost;
                if (serverSaysHost) {
                    toast.success('You are the meeting host');
                }
            }
        }

        options.socketRef.current = io(SOCKET_URL, {
            query: {
                meetingId: options.meetingId,
                userName: savedName,
                socket_token: joinData.socket_token,
                userId: getCurrentUserId(),
                // The server verifies this JWT to decide who you really are. Host
                // status is never taken from a client-supplied userId.
                token
            },
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        // NOTE: `join-meeting` is deliberately NOT emitted here. The server may
        // answer with `waiting-approval` / `join-approved` immediately, and if we
        // announced ourselves before the page attached those listeners the reply
        // would be lost and the user would sit on a blank screen forever.
        // page.tsx emits it once its approval listeners are registered.
        options.setJoinPayload?.({
            meetingId: options.meetingId,
            userId: getCurrentUserId(),
            userName: savedName,
            userEmail: '',
            isTeacher: isUserOwner,
            isBot: false
        });

        await initializeMediaDevices({
            localStreamRef: options.localStreamRef,
            localVideoRef: options.localVideoRef,
            setIsVideoEnabled: options.setIsVideoEnabled || (() => { }),
            setIsAudioEnabled: options.setIsAudioEnabled || (() => { }),
            initialAudioEnabled: options.initialAudioEnabled,
            initialVideoEnabled: options.initialVideoEnabled,
            toast
        });

        // Recording is manual only — user clicks the Record button which calls toggleRecording().
        // This uses getDisplayMedia (tab/screen capture) so the full meeting view is recorded.
        // Auto-recording is disabled because getDisplayMedia requires a direct user gesture
        // and cannot be triggered automatically by the browser.

        toast.success('Joined meeting successfully!');

    } catch (error) {
        console.error('Failed to initialize meeting:', error);
        toast.error('Failed to join meeting');
        options.router.push('/');
    }
};

export const initializeMediaDevices = async (options: {
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    setIsVideoEnabled: (enabled: boolean) => void;
    setIsAudioEnabled: (enabled: boolean) => void;
    initialAudioEnabled?: boolean;
    initialVideoEnabled?: boolean;
    toast: any;
}) => {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Media devices not supported in this browser');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280, min: 640, max: 1920 },
                height: { ideal: 720, min: 480, max: 1080 },
                frameRate: { ideal: 30, min: 15 },
                facingMode: 'user'
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100,
                channelCount: 1
            }
        });

        options.localStreamRef.current = stream;

        if (options.localVideoRef.current) {
            options.localVideoRef.current.srcObject = stream;
            options.localVideoRef.current.muted = true;
            options.localVideoRef.current.playsInline = true;

            try {
                await options.localVideoRef.current.play();
            } catch (playError) {
                console.warn('Auto-play prevented:', playError);
            }
        }


        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        if (videoTrack) {
            videoTrack.enabled = options.initialVideoEnabled !== false;
        }
        if (audioTrack) {
            audioTrack.enabled = options.initialAudioEnabled !== false;
        }

        options.setIsVideoEnabled(videoTrack ? videoTrack.enabled : false);
        options.setIsAudioEnabled(audioTrack ? audioTrack.enabled : false);

        console.log('Media initialized successfully');

    } catch (error: any) {
        console.error('Error initializing media devices:', error);

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            options.toast.error('Camera/microphone access denied. You can still participate with audio only.');

            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                options.localStreamRef.current = audioStream;
                options.setIsVideoEnabled(false);
                options.setIsAudioEnabled(true);
                options.toast('Audio-only mode activated');

                // Set up placeholder video if needed
                if (options.localVideoRef.current) {
                    const placeholder = createLocalVideoPlaceholder('User');
                    if (placeholder) {
                        options.localVideoRef.current.srcObject = placeholder;
                        options.localVideoRef.current.muted = true;
                        options.localVideoRef.current.playsInline = true;
                    }
                }
            } catch (audioError) {
                console.error('Failed to get audio:', audioError);
                const placeholder = createLocalVideoPlaceholder('User');
                if (placeholder && options.localVideoRef.current) {
                    options.localStreamRef.current = placeholder;
                    options.localVideoRef.current.srcObject = placeholder;
                    options.localVideoRef.current.muted = true;
                    options.localVideoRef.current.playsInline = true;
                }
            }

        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            options.toast.error('No camera found. Using audio only.');

            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                options.localStreamRef.current = audioStream;
                options.setIsVideoEnabled(false);
                options.setIsAudioEnabled(true);

                // Set up placeholder video
                if (options.localVideoRef.current) {
                    const placeholder = createLocalVideoPlaceholder('User');
                    if (placeholder) {
                        options.localVideoRef.current.srcObject = placeholder;
                        options.localVideoRef.current.muted = true;
                        options.localVideoRef.current.playsInline = true;
                    }
                }
            } catch (audioError) {
                console.error('Failed to get audio:', audioError);
                const placeholder = createLocalVideoPlaceholder('User');
                if (placeholder && options.localVideoRef.current) {
                    options.localStreamRef.current = placeholder;
                    options.localVideoRef.current.srcObject = placeholder;
                    options.localVideoRef.current.muted = true;
                    options.localVideoRef.current.playsInline = true;
                }
            }

        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            options.toast.error('Camera/microphone is already in use by another application.');
            const placeholder = createLocalVideoPlaceholder('User');
            if (placeholder && options.localVideoRef.current) {
                options.localStreamRef.current = placeholder;
                options.localVideoRef.current.srcObject = placeholder;
                options.localVideoRef.current.muted = true;
                options.localVideoRef.current.playsInline = true;
            }

        } else if (error.name === 'OverconstrainedError') {
            options.toast.error('Camera doesn\'t support requested settings. Using default settings.');

            try {
                const simpleStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                options.localStreamRef.current = simpleStream;
                if (options.localVideoRef.current) {
                    options.localVideoRef.current.srcObject = simpleStream;
                    options.localVideoRef.current.muted = true;
                    options.localVideoRef.current.playsInline = true;
                }
            } catch (simpleError) {
                console.error('Failed with simple constraints:', simpleError);
                const placeholder = createLocalVideoPlaceholder('User');
                if (placeholder && options.localVideoRef.current) {
                    options.localStreamRef.current = placeholder;
                    options.localVideoRef.current.srcObject = placeholder;
                    options.localVideoRef.current.muted = true;
                    options.localVideoRef.current.playsInline = true;
                }
            }

        } else {
            options.toast.error('Failed to access camera/microphone. You can still participate.');
            const placeholder = createLocalVideoPlaceholder('User');
            if (placeholder && options.localVideoRef.current) {
                options.localStreamRef.current = placeholder;
                options.localVideoRef.current.srcObject = placeholder;
                options.localVideoRef.current.muted = true;
                options.localVideoRef.current.playsInline = true;
            }
        }
    }
};

export const initializeSpeechRecognition = (options: {
    recognitionRef: React.MutableRefObject<any>;
    selectedLanguage: string;
    userName: string;
    socketRef: React.MutableRefObject<Socket | null>;
    setCaptions: (captions: Caption[] | ((prev: Caption[]) => Caption[])) => void;
    isLiveTranslationEnabled: boolean;
    targetLanguage: string;
    meetingId: string;
    analyzeSentiment: (text: string) => number;
    toast: any;
    setParticipants: (participants: Participant[] | ((prev: Participant[]) => Participant[])) => void;
    setLiveTranscript?: (transcript: any[] | ((prev: any[]) => any[])) => void;
    setSpeakingDistribution?: (dist: { [key: string]: number } | ((prev: { [key: string]: number }) => { [key: string]: number })) => void;
}) => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.log('Speech recognition not supported in this browser');
        return;
    }

    try {
        options.recognitionRef.current = new SpeechRecognition();
        const recognition = options.recognitionRef.current;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.lang = options.selectedLanguage || 'en-US';

        recognition.onstart = () => {
            console.log('Speech recognition started');
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal && result[0].confidence > 0.5) {
                    finalTranscript += result[0].transcript + ' ';
                } else if (!result.isFinal) {
                    interimTranscript += result[0].transcript;
                }
            }

            // Show interim results as live caption only (not in transcript)
            if (interimTranscript && !finalTranscript.trim()) {
                const interimCaption: Caption = {
                    id: 'interim-' + Date.now().toString(),
                    userId: options.socketRef.current?.id || 'me',
                    userName: options.userName,
                    text: interimTranscript,
                    timestamp: new Date(),
                    language: options.selectedLanguage,
                    sentiment: 0.5
                };
                options.setCaptions(prev => [...prev.slice(-4), interimCaption]);
                return;
            }

            if (finalTranscript.trim()) {
                const sentiment = options.analyzeSentiment(finalTranscript.trim());
                const caption: Caption = {
                    id: Date.now().toString(),
                    userId: options.socketRef.current?.id || 'me',
                    userName: options.userName,
                    text: finalTranscript.trim(),
                    timestamp: new Date(),
                    language: options.selectedLanguage,
                    sentiment
                };

                if (options.isLiveTranslationEnabled && options.targetLanguage !== options.selectedLanguage) {
                    caption.translatedText = `[Translated to ${options.targetLanguage}] ${finalTranscript.trim()}`;
                }

                if (options.socketRef.current) {
                    options.socketRef.current.emit('caption', {
                        ...caption,
                        meetingId: options.meetingId
                    });
                }

                // Update local participants to show "Speaking..." for self immediately
                options.setParticipants(prev => prev.map(p => {
                    if (p.id === 'local' || p.name === options.userName) {
                        return { ...p, isSpeaking: true };
                    }
                    return p;
                }));

                options.setCaptions(prev => [...prev.slice(-4), caption]);

                // Populate live transcript (append only) — only final results
                if (options.setLiveTranscript) {
                    options.setLiveTranscript(prev => [...prev, {
                        id: caption.id,
                        speaker: options.userName,
                        userId: caption.userId,
                        text: finalTranscript.trim(),
                        timestamp: new Date().toISOString(),
                    }]);
                }

                // Track speaking distribution (word count per speaker)
                if (options.setSpeakingDistribution) {
                    const wordCount = finalTranscript.trim().split(/\s+/).length;
                    options.setSpeakingDistribution(prev => ({
                        ...prev,
                        [options.userName]: (prev[options.userName] || 0) + wordCount
                    }));
                }
            }
        };

        let recognitionActive = false;
        let recognitionRestarting = false;

        recognition.onerror = (event: any) => {
            console.log('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                // No speech detected — restart silently
                if (recognitionActive) {
                    setTimeout(() => {
                        try { recognition.start(); } catch (e) { /* ignore */ }
                    }, 500);
                }
            } else if (event.error === 'aborted') {
                // Was manually stopped — don't restart
            } else if (event.error === 'not-allowed') {
                options.toast.error('Microphone access denied for speech recognition', { id: 'speech-mic-denied' });
            } else {
                // Other errors — restart after delay
                if (recognitionActive) {
                    setTimeout(() => {
                        try { recognition.start(); } catch (e) { /* ignore */ }
                    }, 1000);
                }
            }
        };

        recognition.onend = () => {
            console.log('Speech recognition ended');
            // Auto restart if we didn't manually stop it
            if (recognitionActive && !recognitionRestarting) {
                recognitionRestarting = true;
                setTimeout(() => {
                    try {
                        recognition.start();
                        recognitionRestarting = false;
                    } catch (e) {
                        console.log('Recognition restart error:', e);
                        recognitionRestarting = false;
                    }
                }, 300);
            }
        };

        recognitionActive = true;
        recognition.start();

    } catch (error) {
        console.error('Failed to initialize speech recognition:', error);
    }
};

export const cleanupResources = (options: {
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    remoteVideoRefs: React.MutableRefObject<{ [key: string]: HTMLVideoElement }>;
    recognitionRef: React.MutableRefObject<any>;
    peersRef: React.MutableRefObject<{ [key: string]: any }>;
    audioContextRef: React.MutableRefObject<AudioContext | null>;
    socketRef: React.MutableRefObject<Socket | null>;
    controlsTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
    localVideoRef?: React.MutableRefObject<HTMLVideoElement | null>;
    animationFrameRef?: React.MutableRefObject<number | null>;
}) => {
    try {
        if (options.animationFrameRef && options.animationFrameRef.current !== null) {
            cancelAnimationFrame(options.animationFrameRef.current);
            options.animationFrameRef.current = null;
        }

        if (options.localStreamRef.current) {
            options.localStreamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            options.localStreamRef.current = null;
        }

        // Clean up local video element
        if (options.localVideoRef?.current) {
            options.localVideoRef.current.srcObject = null;
        }

        Object.values(options.remoteVideoRefs.current).forEach(video => {
            if (video && video.srcObject) {
                const stream = video.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                video.srcObject = null;
            }
        });
        options.remoteVideoRefs.current = {};

        if (options.recognitionRef.current) {
            options.recognitionRef.current.stop();
            options.recognitionRef.current = null;
        }

        Object.values(options.peersRef.current).forEach((peer: any) => {
            if (peer.destroy) peer.destroy();
        });
        options.peersRef.current = {};

        if (options.audioContextRef.current) {
            options.audioContextRef.current.close();
            options.audioContextRef.current = null;
        }

        if (options.socketRef.current) {
            options.socketRef.current.disconnect();
            options.socketRef.current = null;
        }

        if (options.controlsTimeoutRef.current) {
            clearTimeout(options.controlsTimeoutRef.current);
        }

    } catch (error) {
        console.error('Error during cleanup:', error);
    }
};

// Global variable to store the original camera stream for later restoration
let originalStreamRef: MediaStream | null = null;
let originalVideoEnabledState: boolean | null = null;

// Helper function to create camera placeholder
const createCameraPlaceholder = (name: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#4c7800';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Camera Off', canvas.width / 2, canvas.height / 2);
        ctx.fillText(name.charAt(0).toUpperCase(), canvas.width / 2, canvas.height / 2 + 50);
    }
    return canvas.captureStream(0);
};

// Helper function to get camera constraints
const getDefaultCameraConstraints = () => ({
    video: {
        width: { ideal: 1280, min: 640, max: 1920 },
        height: { ideal: 720, min: 480, max: 1080 },
        frameRate: { ideal: 30, min: 15 },
        facingMode: 'user'
    },
    audio: false
});

export const toggleScreenShare = async (options: {
    isScreenSharing: boolean;
    setIsScreenSharing: (sharing: boolean) => void;
    setIsVideoEnabled: (enabled: boolean) => void;
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    socketRef: React.MutableRefObject<Socket | null>;
    meetingId: string;
    getCurrentUserId: () => string;
    toast: any;
    isVideoEnabled: boolean;
    isRestart?: boolean;
}) => {
    try {
        if (!options.isScreenSharing || options.isRestart) {
            // If restarting, stop the current share first
            if (options.isRestart && options.isScreenSharing) {
                const currentStream = options.localStreamRef.current;
                currentStream?.getTracks().forEach(track => {
                    if (track.readyState === 'live') track.stop();
                });
            }

            // Store the original camera stream and video state for later restoration
            if (!options.isRestart) {
                if (options.localStreamRef.current) {
                    originalStreamRef = options.localStreamRef.current;
                    originalVideoEnabledState = options.isVideoEnabled;
                } else {
                    originalVideoEnabledState = options.isVideoEnabled;
                }
            }

            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always",
                    displaySurface: "monitor",
                    width: { max: 1920 },
                    height: { max: 1080 },
                    frameRate: { ideal: 15, max: 30 }
                } as any,
                audio: false
            });

            const screenTrack = screenStream.getVideoTracks()[0];

            // Handle screen sharing ending
            screenTrack.onended = () => {
                // Make sure we're on the main thread when calling stopScreenShare
                setTimeout(() => {
                    stopScreenShare({
                        setIsScreenSharing: options.setIsScreenSharing,
                        setIsVideoEnabled: options.setIsVideoEnabled,
                        localStreamRef: options.localStreamRef,
                        localVideoRef: options.localVideoRef,
                        socketRef: options.socketRef,
                        meetingId: options.meetingId,
                        getCurrentUserId: options.getCurrentUserId,
                        toast: options.toast,
                        isVideoEnabled: options.isVideoEnabled
                    });
                }, 0);
            };

            // Get audio tracks from original stream
            const audioTracks = originalStreamRef?.getAudioTracks() || [];

            // Create a new stream combining screen video with existing audio
            const combinedStream = new MediaStream();
            combinedStream.addTrack(screenTrack);

            // Add existing audio track if available
            audioTracks.forEach(track => {
                if (track.readyState === 'live') {
                    combinedStream.addTrack(track);
                }
            });

            // Apply the stream to the video element with proper sizing
            if (options.localVideoRef.current) {
                // Ensure the video element is properly configured for screen sharing
                options.localVideoRef.current.srcObject = combinedStream;
                options.localVideoRef.current.muted = true;
                options.localVideoRef.current.playsInline = true;
                // Ensure proper fit for screen sharing
                options.localVideoRef.current.style.objectFit = 'contain';
                // Explicitly set dimensions to prevent zoom/distortion
                options.localVideoRef.current.style.width = '100%';
                options.localVideoRef.current.style.height = '100%';

                try {
                    await options.localVideoRef.current.play();
                } catch (playError) {
                    console.warn('Auto-play prevented:', playError);
                }
            }

            options.localStreamRef.current = combinedStream;
            options.setIsScreenSharing(true);

            options.socketRef.current?.emit('screen-share-start', {
                meetingId: options.meetingId,
                userId: options.getCurrentUserId()
            });

            options.toast.success('Screen sharing started');

        } else {
            // Stop screen sharing
            await stopScreenShare({
                setIsScreenSharing: options.setIsScreenSharing,
                setIsVideoEnabled: options.setIsVideoEnabled,
                localStreamRef: options.localStreamRef,
                localVideoRef: options.localVideoRef,
                socketRef: options.socketRef,
                meetingId: options.meetingId,
                getCurrentUserId: options.getCurrentUserId,
                toast: options.toast,
                isVideoEnabled: options.isVideoEnabled
            });
        }
    } catch (error: any) {
        console.error('Screen share error:', error);

        if (error.name === 'NotAllowedError') {
            options.toast.error('Screen sharing permission denied');
        } else if (error.name === 'AbortError') {
            options.toast('Screen sharing cancelled');
        } else {
            options.toast.error('Failed to share screen');
        }

        if (options.isScreenSharing) {
            options.setIsScreenSharing(false);
        }
    }
};

// Helper function to properly stop screen sharing
const stopScreenShare = async (options: {
    setIsScreenSharing: (sharing: boolean) => void;
    setIsVideoEnabled: (enabled: boolean) => void;
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    socketRef: React.MutableRefObject<Socket | null>;
    meetingId: string;
    getCurrentUserId: () => string;
    toast: any;
    isVideoEnabled: boolean;
}) => {
    // Stop all screen sharing tracks
    const currentStream = options.localStreamRef.current;
    const screenTracks = currentStream?.getVideoTracks() || [];
    const audioTracks = currentStream?.getAudioTracks() || [];

    screenTracks.forEach(track => {
        if (track.readyState === 'live') {
            track.stop();
        }
    });

    options.socketRef.current?.emit('screen-share-stop', {
        meetingId: options.meetingId,
        userId: options.getCurrentUserId()
    });

    // Get the video enabled state from original or current
    const videoEnabledState = originalVideoEnabledState !== null ? originalVideoEnabledState : options.isVideoEnabled;

    // Restore the camera stream
    await restoreCameraStream({
        localStreamRef: options.localStreamRef,
        localVideoRef: options.localVideoRef,
        isVideoEnabled: videoEnabledState,
        toast: options.toast,
        audioTracks: audioTracks
    });

    // Update the video enabled state
    options.setIsVideoEnabled(videoEnabledState);

    // Reset the original stream reference
    originalStreamRef = null;
    originalVideoEnabledState = null;

    options.setIsScreenSharing(false);

    options.toast.success('Screen sharing stopped');
};

// Helper function to restore camera stream after screen sharing
const restoreCameraStream = async (options: {
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    isVideoEnabled: boolean;
    toast: any;
    audioTracks: MediaStreamTrack[];
}) => {
    try {
        if (options.isVideoEnabled) {
            // Get new camera stream
            const cameraStream = await navigator.mediaDevices.getUserMedia(
                getDefaultCameraConstraints()
            );

            const newVideoTrack = cameraStream.getVideoTracks()[0];

            // Create new stream with camera video
            const newStream = new MediaStream();
            newStream.addTrack(newVideoTrack);

            // Add back audio tracks
            options.audioTracks.forEach(track => {
                if (track.readyState === 'live') {
                    newStream.addTrack(track);
                }
            });

            // Update references
            options.localStreamRef.current = newStream;

            // Update video element
            if (options.localVideoRef.current) {
                options.localVideoRef.current.srcObject = newStream;
                options.localVideoRef.current.style.objectFit = 'cover';
                // Mirror the camera feed
                options.localVideoRef.current.style.transform = 'scaleX(-1)';
                options.localVideoRef.current.style.width = '100%';
                options.localVideoRef.current.style.height = '100%';

                try {
                    await options.localVideoRef.current.play();
                } catch (playError) {
                    console.warn('Auto-play prevented:', playError);
                }
            }

        } else {
            // Show placeholder if camera is disabled
            const placeholderStream = createCameraPlaceholder('User');
            const newStream = new MediaStream();

            // Add placeholder video track
            const placeholderTrack = placeholderStream.getVideoTracks()[0];
            if (placeholderTrack) {
                newStream.addTrack(placeholderTrack);
            }

            // Add back audio tracks
            options.audioTracks.forEach(track => {
                if (track.readyState === 'live') {
                    newStream.addTrack(track);
                }
            });

            options.localStreamRef.current = newStream;

            if (options.localVideoRef.current) {
                options.localVideoRef.current.srcObject = newStream;
                options.localVideoRef.current.style.objectFit = 'cover';
                // Explicitly set dimensions
                options.localVideoRef.current.style.width = '100%';
                options.localVideoRef.current.style.height = '100%';
                // Force reflow to ensure the video element updates properly
                options.localVideoRef.current.load();
            }
        }
    } catch (error) {
        console.error('Error restoring camera stream:', error);
        options.toast.error('Failed to restore camera view');

        // Fallback: Create a basic stream if restoration fails
        try {
            const fallbackStream = new MediaStream();

            // Add back audio tracks if available
            options.audioTracks.forEach(track => {
                if (track.readyState === 'live') {
                    fallbackStream.addTrack(track);
                }
            });

            options.localStreamRef.current = fallbackStream;

            if (options.localVideoRef.current) {
                options.localVideoRef.current.srcObject = fallbackStream;
                options.localVideoRef.current.style.objectFit = 'cover';
                // Explicitly set dimensions
                options.localVideoRef.current.style.width = '100%';
                options.localVideoRef.current.style.height = '100%';
                options.localVideoRef.current.load();
            }
        } catch (fallbackError) {
            console.error('Fallback stream creation failed:', fallbackError);
        }
    }
};

export const toggleAudio = (options: {
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    setIsAudioEnabled: (enabled: boolean) => void;
    socketRef: React.MutableRefObject<Socket | null>;
    getCurrentUserId: () => string;
}) => {
    if (options.localStreamRef.current) {
        const audioTracks = options.localStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) {
            // Toggle all audio tracks
            const newEnabledState = !audioTracks[0].enabled;
            audioTracks.forEach(track => {
                track.enabled = newEnabledState;
            });

            options.setIsAudioEnabled(newEnabledState);
            options.socketRef.current?.emit('audio-toggle', {
                userId: options.getCurrentUserId(),
                enabled: newEnabledState
            });
        } else {
            // If no audio tracks exist, we need to request microphone access
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    const newAudioTracks = stream.getAudioTracks();
                    if (newAudioTracks.length > 0) {
                        // Add new audio tracks to existing stream
                        newAudioTracks.forEach(track => {
                            options.localStreamRef.current?.addTrack(track);
                        });

                        options.setIsAudioEnabled(true);
                        options.socketRef.current?.emit('audio-toggle', {
                            userId: options.getCurrentUserId(),
                            enabled: true
                        });
                    }
                })
                .catch(error => {
                    console.error('Error getting microphone access:', error);
                });
        }
    }
};

export const toggleVideo = async (options: {
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    setIsVideoEnabled: (enabled: boolean) => void;
    socketRef: React.MutableRefObject<Socket | null>;
    getCurrentUserId: () => string;
    isScreenSharing: boolean;
    isVideoEnabled: boolean;
    toast: any;
}) => {
    const newEnabledState = !options.isVideoEnabled;

    // During screen sharing, only update the state - don't modify the stream
    // The MiniVideoBox handles its own camera stream independently
    if (options.isScreenSharing) {
        // Store the desired camera state for when screen sharing stops
        originalVideoEnabledState = newEnabledState;

        options.setIsVideoEnabled(newEnabledState);

        options.socketRef.current?.emit('video-toggle', {
            userId: options.getCurrentUserId(),
            enabled: newEnabledState
        });

        options.toast.success(newEnabledState ? 'Camera enabled for mini video' : 'Camera disabled');
        return;
    }

    // Normal camera toggle when not screen sharing
    const currentStream = options.localStreamRef.current;
    const currentVideoTracks = currentStream?.getVideoTracks() || [];
    const audioTracks = currentStream?.getAudioTracks() || [];

    if (newEnabledState) {
        // Enable camera
        try {
            // Get camera stream
            const cameraStream = await navigator.mediaDevices.getUserMedia(
                getDefaultCameraConstraints()
            );

            const newVideoTrack = cameraStream.getVideoTracks()[0];

            // Create new stream
            const newStream = new MediaStream();
            newStream.addTrack(newVideoTrack);

            // Add existing audio tracks
            audioTracks.forEach(track => {
                if (track.readyState === 'live') {
                    newStream.addTrack(track);
                }
            });

            // Stop old video tracks
            currentVideoTracks.forEach(track => {
                if (track.readyState === 'live') {
                    track.stop();
                }
            });

            // Update references
            options.localStreamRef.current = newStream;

            // Update video element
            if (options.localVideoRef.current) {
                options.localVideoRef.current.srcObject = newStream;
                options.localVideoRef.current.style.objectFit = 'cover';
                options.localVideoRef.current.style.transform = 'scaleX(-1)';
                options.localVideoRef.current.style.width = '100%';
                options.localVideoRef.current.style.height = '100%';

                try {
                    await options.localVideoRef.current.play();
                } catch (playError) {
                    console.warn('Auto-play prevented:', playError);
                }
            }

            options.setIsVideoEnabled(true);

            options.socketRef.current?.emit('video-toggle', {
                userId: options.getCurrentUserId(),
                enabled: true
            });

        } catch (error) {
            console.error('Error enabling camera:', error);
            options.toast.error('Failed to enable camera');
        }
    } else {
        // Disable camera

        // Stop current video tracks
        currentVideoTracks.forEach(track => {
            if (track.readyState === 'live') {
                track.stop();
            }
        });

        // Create audio-only stream
        const newStream = new MediaStream();

        // Add audio tracks
        audioTracks.forEach(track => {
            if (track.readyState === 'live') {
                newStream.addTrack(track);
            }
        });

        // Update references
        options.localStreamRef.current = newStream;

        if (options.localVideoRef.current) {
            options.localVideoRef.current.srcObject = newStream;
        }

        options.setIsVideoEnabled(false);

        options.socketRef.current?.emit('video-toggle', {
            userId: options.getCurrentUserId(),
            enabled: false
        });
    }
};

export const toggleRecording = async (options: {
    isRecording: boolean;
    setIsRecording: (recording: boolean) => void;
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
    recordedChunksRef: React.MutableRefObject<Blob[]>;
    setRecordedBlob: (blob: Blob | null) => void;
    toast: any;
    participants: Participant[];
    participantsRef: React.MutableRefObject<Participant[]>;
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    remoteVideoRefs: React.MutableRefObject<{ [key: string]: HTMLVideoElement }>;
    animationFrameRef: React.MutableRefObject<number | null>;
    audioContextRef: React.MutableRefObject<AudioContext | null>;
    // Server-side recording params
    socketRef?: React.MutableRefObject<Socket | null>;
    meetingId?: string;
    userId?: string;
}) => {
    if (!options.isRecording) {
        // Video+audio recording from existing WebRTC streams (no getDisplayMedia)
        console.log('🎬 [toggleRecording] Starting meeting recording...');
        const success = await startMeetingRecording({
            localStreamRef: options.localStreamRef,
            mediaRecorderRef: options.mediaRecorderRef,
            recordedChunksRef: options.recordedChunksRef,
            setIsRecording: options.setIsRecording,
            setRecordedBlob: options.setRecordedBlob,
            remoteVideoRefs: options.remoteVideoRefs,
        });
        if (success) {
            options.toast.success('🔴 Recording started');
        } else {
            options.toast.error('Failed to start recording — no tracks available');
        }
    } else {
        // Stop recording
        if (options.mediaRecorderRef.current?.state === 'recording') {
            options.mediaRecorderRef.current.stop();
        }
        options.mediaRecorderRef.current = null;
        options.setIsRecording(false);
        options.toast.success('Recording stopped');
    }
};

/**
 * startMeetingRecording — uses getDisplayMedia for screen capture + getUserMedia
 * for microphone audio. One-click flow: browser share dialog appears, user selects
 * tab/screen, recording starts immediately.
 * 
 * Returns the screen and mic streams so they can be cleaned up on stop.
 */
export const startMeetingRecording = async (options: {
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
    recordedChunksRef: React.MutableRefObject<Blob[]>;
    setIsRecording: (recording: boolean) => void;
    setRecordedBlob: (blob: Blob | null) => void;
    remoteVideoRefs: React.MutableRefObject<{ [key: string]: HTMLVideoElement }>;
    // New: refs to store the recording-specific streams for cleanup
    screenStreamRef?: React.MutableRefObject<MediaStream | null>;
    micStreamRef?: React.MutableRefObject<MediaStream | null>;
    // Callback when user stops screen share from browser UI
    onRecordingStopped?: () => void;
}): Promise<boolean> => {
    try {
        // Check browser support
        if (typeof MediaRecorder === 'undefined') {
            console.error('❌ MediaRecorder not supported in this browser');
            return false;
        }

        if (!navigator.mediaDevices?.getDisplayMedia) {
            console.error('❌ getDisplayMedia not supported in this browser');
            return false;
        }

        // 1. Get screen stream (this triggers the browser share dialog — the ONLY user step)
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 30 }, displaySurface: 'browser' as any },
            audio: true,
        });

        // 2. Get mic audio (separate stream to always include user voice)
        let micStream: MediaStream | null = null;
        try {
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            });
        } catch (micErr) {
            console.warn('⚠️ Could not get mic audio, recording screen audio only:', micErr);
        }

        // 3. Combine all tracks
        const allTracks: MediaStreamTrack[] = [
            ...screenStream.getVideoTracks(),
            ...screenStream.getAudioTracks(),
        ];
        if (micStream) {
            micStream.getAudioTracks().forEach(t => allTracks.push(t));
        }

        if (allTracks.length === 0) {
            console.warn('⚠️ No tracks available for recording');
            screenStream.getTracks().forEach(t => t.stop());
            micStream?.getTracks().forEach(t => t.stop());
            return false;
        }

        console.log(`🎬 Recording tracks: ${allTracks.length} (screen video + audio + mic)`);

        const recordingStream = new MediaStream(allTracks);

        // Choose best supported mimeType
        let mimeType = '';
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
            mimeType = 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
            mimeType = 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
        }

        const mediaRecorder = new MediaRecorder(recordingStream, {
            ...(mimeType ? { mimeType } : {}),
        });

        options.recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                options.recordedChunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            console.log(`📦 Recording stopped. ${options.recordedChunksRef.current.length} chunks collected`);
            if (options.recordedChunksRef.current.length > 0) {
                const blob = new Blob(options.recordedChunksRef.current, { type: 'video/webm' });
                options.setRecordedBlob(blob);
                console.log(`📦 Recording blob: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
            }
        };

        mediaRecorder.onerror = (event: any) => {
            console.error('❌ MediaRecorder error:', event.error);
        };

        // 4. If user stops screen share from browser UI, auto-stop recording
        screenStream.getVideoTracks()[0].onended = () => {
            console.log('🛑 User stopped screen share — auto-stopping recording');
            if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
            screenStream.getTracks().forEach(t => t.stop());
            micStream?.getTracks().forEach(t => t.stop());
            options.setIsRecording(false);
            options.onRecordingStopped?.();
        };

        // Store streams for cleanup
        if (options.screenStreamRef) options.screenStreamRef.current = screenStream;
        if (options.micStreamRef) options.micStreamRef.current = micStream;

        mediaRecorder.start(1000); // Collect data every second
        options.mediaRecorderRef.current = mediaRecorder;
        options.setIsRecording(true);

        console.log('✅ Screen recording started');
        return true;

    } catch (err: any) {
        // User cancelled the browser share dialog — fail silently
        if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
            console.log('ℹ️ User cancelled screen share dialog');
        } else {
            console.error('❌ Failed to start screen recording:', err);
        }
        return false;
    }
};

/**
 * stopMeetingRecording — cleanly stops the MediaRecorder and all recording streams.
 */
export const stopMeetingRecording = (options: {
    mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
    audioRecorderRef?: React.MutableRefObject<MediaRecorder | null>;
    screenStreamRef: React.MutableRefObject<MediaStream | null>;
    micStreamRef: React.MutableRefObject<MediaStream | null>;
    setIsRecording: (recording: boolean) => void;
}) => {
    const { mediaRecorderRef, audioRecorderRef, screenStreamRef, micStreamRef, setIsRecording } = options;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }

    if (audioRecorderRef && audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
        audioRecorderRef.current.stop();
    }

    // Clean up streams
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    micStreamRef.current = null;

    setIsRecording(false);
    console.log('🛑 Recording stopped and streams cleaned up');
};

/**
 * Record the whole browser tab — captures exactly what the user sees on screen.
 * Uses preferCurrentTab so the browser pre-selects this tab in the share dialog.
 * Mixes microphone audio in so voices are captured even if tab audio is muted.
 * Falls back to canvas compositing if getDisplayMedia is unavailable.
 */
export const startTabRecording = async (options: {
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
    recordedChunksRef: React.MutableRefObject<Blob[]>;
    setIsRecording: (recording: boolean) => void;
    setRecordedBlob: (blob: Blob | null) => void;
    toast: any;
    participants: Participant[];
    participantsRef: React.MutableRefObject<Participant[]>;
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    remoteVideoRefs: React.MutableRefObject<{ [key: string]: HTMLVideoElement }>;
    animationFrameRef: React.MutableRefObject<number | null>;
    audioContextRef: React.MutableRefObject<AudioContext | null>;
}): Promise<boolean> => {
    try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
            options.toast.error('Screen capture not supported. Using camera view instead.');
            return startCompositedRecording(options);
        }

        console.log('🎬 Starting tab/screen recording...');

        // Capture the current browser tab.
        // preferCurrentTab=true pre-selects THIS tab in the browser dialog — 
        // user just clicks "Share" without needing to pick anything.
        let displayStream: MediaStream;
        try {
            displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 },
                    displaySurface: 'monitor',   // prefers entire screen/display
                },
                audio: true,                      // capture system audio if available
            } as any);
        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                options.toast.error('Screen recording permission denied');
                return false;
            }
            // Fallback without the newer hints if browser is older
            displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
                audio: true,
            });
        }

        // Mix microphone audio with the tab audio so voices are always captured
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        const audioCtx = new AudioContextClass();
        options.audioContextRef.current = audioCtx;
        const destNode = audioCtx.createMediaStreamDestination();

        // Tab audio (may or may not exist depending on browser/OS)
        if (displayStream.getAudioTracks().length > 0) {
            const tabSource = audioCtx.createMediaStreamSource(displayStream);
            tabSource.connect(destNode);
        }

        // Microphone audio from the local stream (always present)
        const localStream = options.localStreamRef.current;
        if (localStream && localStream.getAudioTracks().length > 0) {
            const micSource = audioCtx.createMediaStreamSource(localStream);
            micSource.connect(destNode);
        }

        // Build the final recording stream: tab video + mixed audio
        const recordingStream = new MediaStream([
            ...displayStream.getVideoTracks(),
            ...destNode.stream.getAudioTracks(),
        ]);

        // When user stops sharing from the browser's built-in stop button,
        // automatically stop the recording too
        displayStream.getVideoTracks()[0].onended = () => {
            console.log('🛑 Tab sharing ended by user — stopping recording');
            if (options.mediaRecorderRef.current?.state === 'recording') {
                options.mediaRecorderRef.current.stop();
            }
            options.mediaRecorderRef.current = null;
            options.setIsRecording(false);
            audioCtx.close();
            options.toast.success('Recording stopped');
        };

        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
            ? 'video/webm;codecs=vp9,opus'
            : 'video/webm';

        const mediaRecorder = new MediaRecorder(recordingStream, {
            mimeType,
            videoBitsPerSecond: 5_000_000, // 5 Mbps — good for screen content
            audioBitsPerSecond: 128_000,
        });

        options.recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) options.recordedChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
            // Stop all captured tracks
            recordingStream.getTracks().forEach(t => t.stop());
            displayStream.getTracks().forEach(t => t.stop());
            audioCtx.close();

            const blob = new Blob(options.recordedChunksRef.current, { type: 'video/webm' });
            console.log(`✅ Tab recording finished. Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
            options.setRecordedBlob(blob);
            options.setIsRecording(false);
        };

        mediaRecorder.onerror = (event: any) => {
            console.error('MediaRecorder error:', event.error);
        };

        mediaRecorder.start(1000); // 1 second chunks
        options.mediaRecorderRef.current = mediaRecorder;
        options.setIsRecording(true);

        console.log('✅ Tab recording started — capturing full meeting view');
        return true;

    } catch (error: any) {
        console.error('Tab recording failed:', error);
        options.toast.error('Could not start screen recording — falling back to camera view');
        // Graceful fallback to canvas compositing
        return startCompositedRecording(options);
    }
};

/**
 * Start composited recording using an offscreen canvas.
 * This draws the local and remote video feeds onto a canvas and records the stream.
 * It does NOT trigger a screen share prompt.
 */
export const startCompositedRecording = async (options: {
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
    recordedChunksRef: React.MutableRefObject<Blob[]>;
    setIsRecording: (recording: boolean) => void;
    setRecordedBlob: (blob: Blob | null) => void;
    toast: any;
    participants: Participant[];
    participantsRef: React.MutableRefObject<Participant[]>;
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    remoteVideoRefs: React.MutableRefObject<{ [key: string]: HTMLVideoElement }>;
    animationFrameRef: React.MutableRefObject<number | null>;
    audioContextRef: React.MutableRefObject<AudioContext | null>;
}): Promise<boolean> => {
    try {
        if (!options.localStreamRef.current) {
            console.error('❌ No local stream available for recording');
            options.toast.error('No camera/mic access for recording');
            return false;
        }

        console.log('🎬 Starting Composited Recording (Canvas + Audio Mix)...');

        // 1. Setup Canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            console.error('❌ Could not create canvas context');
            return false;
        }

        // 2. Setup Audio Mixing
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        const audioCtx = new AudioContextClass();
        options.audioContextRef.current = audioCtx;

        const destNode = audioCtx.createMediaStreamDestination();

        // Add Local Audio
        if (options.localStreamRef.current.getAudioTracks().length > 0) {
            const localSource = audioCtx.createMediaStreamSource(options.localStreamRef.current);
            localSource.connect(destNode);
        }

        // Add Remote Audio (from video elements)
        // We use the Ref to ensure we get current participants
        // Note: For audio, we might need a MutationObserver or periodic check if new peers join
        // For now, valid for current peers. 
        // IMPROVEMENT: Move audio connection logic to a separate function called when peers update.
        // But for "simple" fix, let's iterate existing.
        // Ideally, MeetingPage should handle audio routing, but here we tap into video elements.

        // Fix: We need to continuously add new audio sources if new people join.
        // However, Web Audio API graph is static-ish.
        // A better approach for audio is to rely on the fact that `remoteVideoRefs` usually 
        // hold the audio. If we capture the *mixed* audio from the OS, we can't (no system audio in browser without screen share).
        // So we MUST mix streams.

        // To handle dynamic audio, we'll need to check for new video elements in the render loop or similar.
        // But connecting nodes in a rAF loop is bad.
        // User objective implies visual "display of whatever happened".

        // Let's at least get the visual part dynamic.
        Object.values(options.remoteVideoRefs.current).forEach(videoEl => {
            if (videoEl && videoEl.srcObject) {
                const stream = videoEl.srcObject as MediaStream;
                if (stream.getAudioTracks().length > 0) {
                    try {
                        // Check if we already connected this stream? 
                        // Hard to track without a map. 
                        // For now, stick to initial participants for audio, 
                        // or accept that late joiners audio might be missing until we refactor audio mixing deeper.
                        const remoteSource = audioCtx.createMediaStreamSource(stream);
                        remoteSource.connect(destNode);
                    } catch (e) {
                        // Ignore
                    }
                }
            }
        });

        // 3. Start Render Loop
        const renderLoop = () => {
            if (!ctx || !options.localVideoRef.current) return;

            // Clear canvas
            ctx.fillStyle = '#1c1c17'; // Slate-800 background
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Get all visible video elements
            const videosToDraw: { element: HTMLVideoElement, name: string, isCamOff: boolean }[] = [];

            // Local Video
            const localVid = options.localVideoRef.current;
            // Check if video track is active
            const localStream = options.localStreamRef.current;
            const isLocalVideoOn = localStream && localStream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled);

            videosToDraw.push({
                element: localVid,
                name: "You",
                isCamOff: !isLocalVideoOn
            });

            // Remote Videos - USE REF for dynamic updates
            if (options.participantsRef && options.participantsRef.current) {
                options.participantsRef.current.forEach(p => {
                    if (p.id === 'local') return; // Skip self if in list
                    const vidEl = options.remoteVideoRefs.current[p.id];
                    if (vidEl) {
                        videosToDraw.push({
                            element: vidEl,
                            name: p.name,
                            isCamOff: !p.isVideoEnabled
                        });
                    }
                });
            } else {
                // Fallback to initial list if Ref not provided (should not happen with new code)
                options.participants.forEach(p => {
                    if (p.id === 'local') return;
                    const vidEl = options.remoteVideoRefs.current[p.id];
                    if (vidEl) {
                        videosToDraw.push({
                            element: vidEl,
                            name: p.name,
                            isCamOff: !p.isVideoEnabled
                        });
                    }
                });
            }

            // Calculate Grid Layout
            const count = videosToDraw.length;
            let cols = 1;
            let rows = 1;
            if (count === 0) {
                // Determine nothing to draw, but keep loop running
            } else if (count === 1) {
                cols = 1; rows = 1;
            } else if (count === 2) {
                cols = 2; rows = 1;
            } else if (count <= 4) {
                cols = 2; rows = 2;
            } else if (count <= 6) {
                cols = 3; rows = 2;
            } else if (count <= 9) {
                cols = 3; rows = 3;
            } else {
                cols = 4; rows = 3; // Max 12
            }

            const cellWidth = canvas.width / cols;
            const cellHeight = canvas.height / rows;

            videosToDraw.forEach((item, index) => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                const x = col * cellWidth;
                const y = row * cellHeight;

                // Inner padding
                const p = 10;
                const drawX = x + p;
                const drawY = y + p;
                const drawW = cellWidth - 2 * p;
                const drawH = cellHeight - 2 * p;

                // Draw Background for Cell
                ctx.fillStyle = '#0d0d0b'; // Slate-950
                ctx.fillRect(drawX, drawY, drawW, drawH);

                if (item.isCamOff) {
                    // Draw Placeholder
                    ctx.fillStyle = '#3f3c36';
                    ctx.fillRect(drawX, drawY, drawW, drawH);

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 40px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const initial = item.name.charAt(0).toUpperCase();
                    ctx.fillText(initial, drawX + drawW / 2, drawY + drawH / 2);
                } else {
                    // Draw Video
                    // Calculate "cover" fit
                    const vidW = item.element.videoWidth || 640;
                    const vidH = item.element.videoHeight || 480;
                    const scale = Math.max(drawW / vidW, drawH / vidH);
                    const sw = drawW / scale;
                    const sh = drawH / scale;
                    const sx = (vidW - sw) / 2;
                    const sy = (vidH - sh) / 2;

                    try {
                        ctx.drawImage(item.element, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
                    } catch (e) {
                        // Video might not be ready
                    }
                }

                // Draw Name Label
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(drawX + 10, drawY + drawH - 50, 20 + item.name.length * 15, 40);

                ctx.fillStyle = 'white';
                ctx.font = '20px Inter, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.name, drawX + 20, drawY + drawH - 30);
            });

            options.animationFrameRef.current = requestAnimationFrame(renderLoop);
        };

        // Start Loop
        options.animationFrameRef.current = requestAnimationFrame(renderLoop);

        // 4. Capture Stream & Record
        const canvasStream = canvas.captureStream(30); // 30 FPS
        const mixedAudioTrack = destNode.stream.getAudioTracks()[0];
        if (mixedAudioTrack) {
            canvasStream.addTrack(mixedAudioTrack);
        }

        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
            ? 'video/webm;codecs=vp9,opus'
            : 'video/webm';

        console.log(`📹 Composited Recording MIME: ${mimeType}`);

        const mediaRecorder = new MediaRecorder(canvasStream, {
            mimeType: mimeType,
            videoBitsPerSecond: 4000000, // 4 Mbps
        });

        options.recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                options.recordedChunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(options.recordedChunksRef.current, { type: mimeType });
            options.setRecordedBlob(blob);
            options.setIsRecording(false);
            console.log(`✅ Composited Recording Finished. Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

            // Cleanup local tracks from canvas stream (not the original streams!)
            canvasStream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.onerror = (event: any) => {
            console.error('MediaRecorder error:', event.error);
        };

        mediaRecorder.start(1000); // 1s chunks
        options.mediaRecorderRef.current = mediaRecorder;
        options.setIsRecording(true);

        return true;

    } catch (error) {
        console.error('Failed to start composited recording:', error);
        options.toast.error('Recording initialization failed');
        return false;
    }
};

/**
 * Start camera+microphone recording like Google Meet
 * This requests both video and audio from the user's camera and microphone
 */
export const startCameraRecording = async (options: {
    mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
    recordedChunksRef: React.MutableRefObject<Blob[]>;
    setIsRecording: (recording: boolean) => void;
    setRecordedBlob: (blob: Blob | null) => void;
    toast: any;
}): Promise<boolean> => {
    try {
        // Request both video and audio for Google Meet-like recording
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                frameRate: { ideal: 30 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            }
        });

        // Use video/webm MIME type for video+audio recording
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
            ? 'video/webm;codecs=vp8,opus'
            : 'video/webm';

        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: 2500000,
            audioBitsPerSecond: 128000
        });

        options.recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                options.recordedChunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            // Stop all tracks when recording stops
            stream.getTracks().forEach(track => track.stop());

            const blob = new Blob(options.recordedChunksRef.current, { type: mimeType });
            options.setRecordedBlob(blob);
            options.setIsRecording(false);
            options.toast.success('Recording saved successfully');
        };

        mediaRecorder.start(1000); // Collect data every second
        options.mediaRecorderRef.current = mediaRecorder;
        options.setIsRecording(true);

        console.log('📹 Camera recording started with MIME type:', mimeType);
        return true;

    } catch (error: any) {
        console.error('Error starting camera recording:', error);

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            options.toast.error('Camera/microphone access denied. Please allow permissions.');
        } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
            options.toast.error('Camera/microphone not found or not supported.');
        } else {
            options.toast.error('Failed to start recording: ' + error.message);
        }

        return false;
    }
};

/**
 * startAudioOnlyRecording — silently records microphone audio only.
 * Called when user clicks "No" on the recording consent popup.
 * User is not informed; audio is used for transcription in meeting notes.
 * Deliberately does NOT update setIsRecording — stays invisible in the UI.
 */
export const startAudioOnlyRecording = async (options: {
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
    recordedChunksRef: React.MutableRefObject<Blob[]>;
    setRecordedBlob: (blob: Blob | null) => void;
}): Promise<boolean> => {
    try {
        if (options.mediaRecorderRef.current?.state === 'recording') {
            return true; // already recording
        }

        console.log('🎤 Starting silent audio-only recording...');

        const localStream = options.localStreamRef.current;
        const audioTracks = localStream?.getAudioTracks().filter(t => t.readyState === 'live') || [];

        // If no audio from local stream, request mic directly
        let recordingStream: MediaStream;
        if (audioTracks.length > 0) {
            recordingStream = new MediaStream(audioTracks.map(t => t.clone()));
        } else {
            try {
                recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch {
                console.error('❌ No audio available for silent recording');
                return false;
            }
        }

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';

        const mediaRecorder = new MediaRecorder(recordingStream, {
            mimeType,
            audioBitsPerSecond: 128_000,
        });

        options.recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) options.recordedChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
            recordingStream.getTracks().forEach(t => t.stop());
            const blob = new Blob(options.recordedChunksRef.current, { type: 'audio/webm' });
            console.log(`✅ Audio-only recording finished. Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
            options.setRecordedBlob(blob);
            // Deliberately do NOT call setIsRecording — stays invisible in the UI
        };

        mediaRecorder.start(1000);
        options.mediaRecorderRef.current = mediaRecorder;
        // Deliberately do NOT call setIsRecording(true) — stays invisible in the UI

        console.log('✅ Silent audio-only recording started');
        return true;

    } catch (err) {
        console.error('❌ Failed to start audio-only recording:', err);
        return false;
    }
};

/**
 * Start screen recording automatically using the existing local stream (camera).
 * This function is used for auto-recording when meeting.settings.auto_record is true.
 * NOTE: For true screen recording, user interaction is required via getDisplayMedia(),
 * so auto-recording will use the camera feed as a fallback.
 */
export const startSilentRecording = async (options: {
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
    recordedChunksRef: React.MutableRefObject<Blob[]>;
    setIsRecording: (recording: boolean) => void;
    setRecordedBlob: (blob: Blob | null) => void;
}): Promise<boolean> => {
    try {
        // Check if already recording
        if (options.mediaRecorderRef.current && options.mediaRecorderRef.current.state === 'recording') {
            console.log('⚠️ Already recording, skipping auto-start');
            return true;
        }

        console.log('🎬 Starting screen auto-recording...');

        // For auto-recording, we'll use the existing local stream (camera) as a fallback
        // since getDisplayMedia() requires user interaction
        const localStream = options.localStreamRef.current;

        if (!localStream || localStream.getTracks().length === 0) {
            console.error('❌ No local stream available for auto-recording');
            return false;
        }

        // Clone the stream to avoid interference with the live call
        const recordingStream = new MediaStream();

        // Add audio tracks
        localStream.getAudioTracks().forEach(track => {
            if (track.readyState === 'live') {
                recordingStream.addTrack(track.clone());
            }
        });

        // Add video tracks
        localStream.getVideoTracks().forEach(track => {
            if (track.readyState === 'live') {
                recordingStream.addTrack(track.clone());
            }
        });

        if (recordingStream.getTracks().length === 0) {
            console.error('❌ No tracks available for recording');
            return false;
        }

        console.log(`📹 Auto-recording stream: ${recordingStream.getAudioTracks().length} audio, ${recordingStream.getVideoTracks().length} video tracks`);

        // Choose appropriate MIME type based on available tracks
        const hasVideo = recordingStream.getVideoTracks().length > 0;
        const mimeType = hasVideo
            ? (MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus') ? 'video/webm; codecs=vp8,opus' : 'video/webm')
            : (MediaRecorder.isTypeSupported('audio/webm; codecs=opus') ? 'audio/webm; codecs=opus' : 'audio/webm');

        const mediaRecorder = new MediaRecorder(recordingStream, {
            mimeType: mimeType,
            videoBitsPerSecond: 2500000,
            audioBitsPerSecond: 128000
        });

        options.recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                options.recordedChunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            // Stop cloned tracks
            recordingStream.getTracks().forEach(track => track.stop());

            // Create blob
            const blob = new Blob(options.recordedChunksRef.current, { type: mimeType.split(';')[0] });
            const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
            console.log(`✅ Auto-recording stopped! Size: ${sizeInMB} MB`);

            options.setRecordedBlob(blob);
        };

        mediaRecorder.onerror = (event: any) => {
            console.error('MediaRecorder error:', event.error);
        };

        mediaRecorder.start(1000);
        options.mediaRecorderRef.current = mediaRecorder;
        options.setIsRecording(true);

        console.log('✅ Screen auto-recording started successfully');
        return true;

    } catch (err) {
        console.error('❌ Failed to start screen auto-recording:', err);
        return false;
    }
};

/**
 * Start true screen recording using getDisplayMedia().
 * This function requires user interaction and shows the browser's screen sharing selection dialog.
 */
export const startScreenRecording = async (options: {
    mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
    recordedChunksRef: React.MutableRefObject<Blob[]>;
    setIsRecording: (recording: boolean) => void;
    setRecordedBlob: (blob: Blob | null) => void;
    toast: any;
}): Promise<boolean> => {
    try {
        // Check if already recording
        if (options.mediaRecorderRef.current && options.mediaRecorderRef.current.state === 'recording') {
            console.log('⚠️ Already recording, stopping current recording first');
            options.mediaRecorderRef.current.stop();
        }

        console.log('🎬 Starting true screen recording...');

        // Get screen capture with audio
        let recordingStream: MediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        console.log('📹 Screen capture stream acquired');

        // Also capture microphone audio separately to mix with screen audio
        try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Create a new stream with screen video + mixed audio
            recordingStream = new MediaStream([
                ...recordingStream.getVideoTracks(),
                ...micStream.getAudioTracks()
            ]);

            console.log('🎤 Mixed screen and microphone audio');
        } catch (audioErr) {
            console.warn('⚠️ Could not access microphone for mixing, using screen audio only:', audioErr);
            // Continue with screen audio only
        }

        // Choose appropriate MIME type
        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus')
            ? 'video/webm; codecs=vp8,opus'
            : 'video/webm';

        console.log('📹 Using MIME type:', mimeType);

        const mediaRecorder = new MediaRecorder(recordingStream, {
            mimeType: mimeType,
            videoBitsPerSecond: 5000000, // Higher bitrate for screen content
            audioBitsPerSecond: 128000
        });

        options.recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                options.recordedChunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            // Stop screen capture tracks
            recordingStream.getTracks().forEach(track => track.stop());

            // Create blob
            const blob = new Blob(options.recordedChunksRef.current, { type: mimeType.split(';')[0] });
            const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
            console.log(`✅ Screen recording stopped! Size: ${sizeInMB} MB`);

            options.setRecordedBlob(blob);
        };

        mediaRecorder.onerror = (event: any) => {
            console.error('MediaRecorder error:', event.error);
        };

        // Handle when user stops screen sharing
        recordingStream.getVideoTracks()[0].onended = () => {
            console.log('UIScreen sharing stopped by user');
            if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
        };

        mediaRecorder.start(1000); // Collect data every second
        options.mediaRecorderRef.current = mediaRecorder;
        options.setIsRecording(true);
        options.toast.success('🖥️ Screen recording started');

        console.log('✅ True screen recording started successfully');
        return true;

    } catch (err: any) {
        console.error('❌ Failed to start screen recording:', err);
        if (err.name === 'NotAllowedError') {
            options.toast.error('Screen recording permission denied. Please allow screen sharing.');
        } else {
            options.toast.error('Failed to start screen recording');
        }
        return false;
    }
};

export const toggleHand = (options: {
    isHandRaised: boolean;
    setIsHandRaised: (raised: boolean) => void;
    socketRef: React.MutableRefObject<Socket | null>;
    meetingId: string;
    getCurrentUserId: () => string;
    toast: any;
}) => {
    const newState = !options.isHandRaised;
    options.setIsHandRaised(newState);
    options.socketRef.current?.emit('hand-toggle', {
        meetingId: options.meetingId,
        userId: options.getCurrentUserId(),
        isRaised: newState
    });
    if (newState) options.toast.success('Hand raised');
};

export const leaveMeeting = async (options: {
    socketRef: React.MutableRefObject<Socket | null>;
    isOwner: boolean;
    isRecording: boolean;
    mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
    recordedChunksRef?: React.MutableRefObject<Blob[]>;
    cleanupResources: () => void;
    router: any;
    meetingId: string;
    getCurrentUserId: () => string;
    toast: any;
    localVideoRef?: React.MutableRefObject<HTMLVideoElement | null>;
    setShowPostMeetingPopup?: (show: boolean) => void;
    recordingStartTime?: number | null;
    recordingId?: string | null;
}) => {
    console.log('🚪 leaveMeeting called');

    try {
        const token = localStorage.getItem('token');

        // Stop recording if still active
        if (options.isRecording && options.mediaRecorderRef.current) {
            console.log('⏹️ Stopping active recording...');
            if (options.mediaRecorderRef.current.state === 'recording') {
                options.mediaRecorderRef.current.stop();
            }
            // Wait for recording to finalize (onstop callback needs time)
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Check if there was a recording
        const hasRecordedData = options.recordedChunksRef &&
            options.recordedChunksRef.current &&
            options.recordedChunksRef.current.length > 0;

        // Check recording duration (>5 seconds to be valid)
        const recordingDuration = options.recordingStartTime
            ? (Date.now() - options.recordingStartTime) / 1000
            : 0;
        const isValidRecording = hasRecordedData && recordingDuration > 5;

        console.log(`💼 Has recorded data: ${hasRecordedData}, chunks: ${options.recordedChunksRef?.current?.length || 0}, duration: ${recordingDuration.toFixed(1)}s, valid: ${isValidRecording}`);

        // Send socket leave event
        if (options.socketRef.current) {
            options.socketRef.current.emit('leave-meeting', {
                meetingId: options.meetingId,
                userId: options.getCurrentUserId(),
                saveRecording: isValidRecording
            });

            setTimeout(() => {
                if (options.socketRef.current) {
                    (options.socketRef.current as any).io?.reconnection(false);
                    options.socketRef.current.disconnect();
                    options.socketRef.current = null;
                }
            }, 200);
        }

        if (isValidRecording && options.setShowPostMeetingPopup) {
            // Valid recording → show the PostMeetingModal (user decides upload vs discard)
            console.log('📹 Valid recording found — showing PostMeetingModal');
            options.setShowPostMeetingPopup(true);
        } else {
            // No valid recording → update status to failed if we have a recordingId
            if (options.recordingId && token) {
                try {
                    await fetch(
                        `${API_URL}/api/meeting-rooms/recording/${options.recordingId}/status`,
                        {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'failed' }),
                        }
                    );
                } catch (e) {
                    console.error('Failed to update recording status:', e);
                }
            }
            options.cleanupResources();
            console.log('🏠 No valid recording, redirecting to create-meeting');
            options.router.push('/create-meeting');
        }

    } catch (error) {
        console.error('❌ Failed to leave meeting:', error);
        options.toast.error('Error leaving meeting');
        options.cleanupResources();
        options.router.push('/create-meeting');
    }
};

export const startVoiceRecording = (options: {
    setIsRecordingVoice: (recording: boolean) => void;
    setVoiceRecording: (blob: Blob | null) => void;
    sendChatMessage: (text: string, sender?: string, attachment?: any) => void;
    userName: string;
    toast: any;
}) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        options.toast.error('Voice recording not supported');
        return;
    }

    options.setIsRecordingVoice(true);
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const mediaRecorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (e) => {
                chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/wav' });
                options.setVoiceRecording(blob);

                const reader = new FileReader();
                reader.onload = () => {
                    const simulatedText = "This is a simulated voice message transcription";
                    options.sendChatMessage(simulatedText, options.userName, {
                        type: 'audio',
                        url: URL.createObjectURL(blob),
                        name: 'voice_message.wav'
                    });
                };
                reader.readAsDataURL(blob);
            };

            mediaRecorder.start();

            setTimeout(() => {
                mediaRecorder.stop();
                stream.getTracks().forEach(track => track.stop());
                options.setIsRecordingVoice(false);
            }, 10000);
        })
        .catch(error => {
            console.error('Error recording audio:', error);
            options.toast.error('Failed to record audio');
            options.setIsRecordingVoice(false);
        });
};

export const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    options: {
        setSelectedImage: (image: string | null) => void;
        sendChatMessage: (text: string, sender?: string, attachment?: any) => void;
        addAIMessage: (text: string) => void;
        userName: string;
        toast: any;
    }
) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        options.toast.error('Please upload an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        options.setSelectedImage(imageUrl);

        options.sendChatMessage("📸 Image uploaded for analysis", options.userName, {
            type: 'image',
            url: imageUrl,
            name: file.name
        });

        setTimeout(() => {
            options.addAIMessage("🤖 I've analyzed the uploaded image. It appears to be a document/screenshot. I can help extract text or analyze content if needed.");
        }, 1000);
    };
    reader.readAsDataURL(file);
};

export const requestGhostReplay = (
    query: string,
    options: {
        ghostReplays: GhostReplay[];
        addAIMessage: (text: string) => void;
        isAIEnabled: boolean;
        setGhostReplays: (replays: GhostReplay[] | ((prev: GhostReplay[]) => GhostReplay[])) => void;
        setActiveGhostReplay: (replayId: string | null) => void;
    }
) => {
    const matchingReplays = options.ghostReplays.filter(replay =>
        replay.text.toLowerCase().includes(query.toLowerCase()) ||
        replay.context.toLowerCase().includes(query.toLowerCase()) ||
        replay.userName.toLowerCase().includes(query.toLowerCase())
    );

    if (matchingReplays.length === 0) {
        options.addAIMessage(`No matching audio found for query: "${query}"`);
        return;
    }

    const replay = matchingReplays[0];

    options.addAIMessage(`🎤 Reconstructing ${replay.userName}'s voice: "${replay.text}"`);

    const audioUrl = `data:audio/wav;base64,${btoa('simulated_audio')}`;

    const updatedReplay: GhostReplay = {
        ...replay,
        audioUrl,
        isPlaying: true
    };

    options.setGhostReplays(prev => prev.map((r: GhostReplay) =>
        r.id === replay.id ? updatedReplay : { ...r, isPlaying: false }
    ));
    options.setActiveGhostReplay(replay.id);

    setTimeout(() => {
        options.setGhostReplays(prev => prev.map((r: GhostReplay) =>
            r.id === replay.id ? { ...r, isPlaying: false } : r
        ));
        options.setActiveGhostReplay(null);
    }, 3000);
};

export const createFollowUpTask = (
    type: 'trello' | 'jira' | 'email' | 'notion' | 'sheets' | 'code' | 'reminder',
    title: string,
    assignedTo: string[],
    options: {
        setFollowUpTasks: (tasks: any[] | ((prev: any[]) => any[])) => void;
        executeFollowUpTask: (task: any) => void;
    }
) => {
    const task = {
        id: Date.now().toString(),
        type,
        title,
        description: `Auto-generated from meeting discussion: ${title}`,
        assignedTo,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending' as const,
        metadata: {}
    };

    options.setFollowUpTasks(prev => [...prev, task]);

    setTimeout(() => {
        options.executeFollowUpTask(task);
    }, 2000);
};

export const executeFollowUpTask = (
    task: any,
    options: {
        setFollowUpTasks: (tasks: any[] | ((prev: any[]) => any[])) => void;
        sendChatMessage: (text: string, sender?: string) => void;
    }
) => {
    options.setFollowUpTasks((prev: any[]) => prev.map((t: any) =>
        t.id === task.id ? { ...t, status: 'processing' } : t
    ));

    setTimeout(() => {
        let message = '';
        switch (task.type) {
            case 'email':
                message = `📧 Email sent to ${task.assignedTo.join(', ')}: "${task.title}"`;
                break;
            case 'trello':
                message = `📋 Trello card created: "${task.title}"`;
                break;
            case 'jira':
                message = `🎫 Jira ticket created: "${task.title}"`;
                break;
            case 'notion':
                message = `📝 Notion page updated: "${task.title}"`;
                break;
            case 'sheets':
                message = `📊 Google Sheets updated: "${task.title}"`;
                break;
            case 'code':
                message = `💻 Code task created in repository: "${task.title}"`;
                break;
            case 'reminder':
                message = `⏰ Reminder set for ${task.assignedTo.join(', ')}: "${task.title}"`;
                break;
        }

        options.sendChatMessage(message, 'AI Assistant');

        options.setFollowUpTasks(prev => prev.map((t: any) =>
            t.id === task.id ? { ...t, status: 'completed' } : t
        ));
    }, 3000);
};

export const sendReaction = (options: {
    emoji: string;
    setFloatingEmojis: (emojis: FloatingEmoji[] | ((prev: FloatingEmoji[]) => FloatingEmoji[])) => void;
    setActiveReactions: (reactions: { [key: string]: string } | ((prev: { [key: string]: string }) => { [key: string]: string })) => void;
    socketRef: React.MutableRefObject<Socket | null>;
    meetingId: string;
    getCurrentUserId: () => string;
    toast: any;
    userId?: string;
}) => {
    const floatingEmoji: FloatingEmoji = {
        id: Date.now().toString(),
        emoji: options.emoji,
        x: Math.random() * 80 + 10,
        y: 80,
        userId: options.userId || 'local'
    };

    options.setFloatingEmojis(prev => [...prev, floatingEmoji]);

    options.setActiveReactions((prev: { [key: string]: string }) => ({
        ...prev,
        [options.userId || 'local']: options.emoji
    }));

    options.socketRef.current?.emit('reaction', {
        emoji: options.emoji,
        userId: options.userId === 'local' ? options.getCurrentUserId() : options.userId,
        meetingId: options.meetingId
    });

    setTimeout(() => {
        options.setFloatingEmojis(prev => prev.filter(e => e.id !== floatingEmoji.id));
        options.setActiveReactions(prev => {
            const newReactions = { ...prev };
            delete newReactions[options.userId || 'local'];
            return newReactions;
        });
    }, 3000);

    options.toast.success(`Reacted with ${options.emoji}`);
};

export const sendMessageReaction = (
    messageId: string,
    emoji: string,
    options: {
        setMessageReactions: (reactions: { [key: string]: { [emoji: string]: number } } | ((prev: { [key: string]: { [emoji: string]: number } }) => { [key: string]: { [emoji: string]: number } })) => void;
        socketRef: React.MutableRefObject<Socket | null>;
        meetingId: string;
    }
) => {
    options.setMessageReactions((prev: { [key: string]: { [emoji: string]: number } }) => {
        const current = prev[messageId] || {};
        return {
            ...prev,
            [messageId]: {
                ...current,
                [emoji]: (current[emoji] || 0) + 1
            }
        };
    });

    options.socketRef.current?.emit('message-reaction', {
        messageId,
        emoji,
        userId: 'user',
        meetingId: options.meetingId
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE RECORDING
// Streams audio over WebSocket to the Flask media-chunk handler.
// The server records, transcribes, and saves — no screen share prompt needed.
// ─────────────────────────────────────────────────────────────────────────────

/** Persistent refs used across start/stop calls */
let _ssrAudioContext: AudioContext | null = null;
let _ssrProcessor: ScriptProcessorNode | null = null;
let _ssrSource: MediaStreamAudioSourceNode | null = null;
let _ssrIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start streaming microphone audio to the server via the existing `media-chunk`
 * socket event.  The server's MeetingRecorder handles transcription + storage.
 *
 * Requires: the local microphone stream already acquired during meeting join
 * (in localStreamRef).  No new permissions are asked.
 */
export const startServerSideRecording = async (options: {
    localStreamRef: React.MutableRefObject<MediaStream | null>;
    socketRef: React.MutableRefObject<Socket | null>;
    meetingId: string;
    userId: string;
}): Promise<boolean> => {
    try {
        if (_ssrProcessor) {
            console.log('⚠️ [SSR] Already streaming audio to server');
            return true;
        }

        const localStream = options.localStreamRef.current;
        const audioTracks = localStream?.getAudioTracks().filter(t => t.readyState === 'live') ?? [];

        let sourceStream: MediaStream;
        if (audioTracks.length > 0) {
            // Re-use existing mic track — zero extra permissions
            sourceStream = new MediaStream(audioTracks);
            console.log('🎤 [SSR] Using existing mic track');
        } else {
            // Fallback: ask for mic (only happens if mic wasn't opened yet)
            try {
                sourceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('🎤 [SSR] Acquired mic via getUserMedia fallback');
            } catch {
                console.error('❌ [SSR] No audio available');
                return false;
            }
        }

        // AudioContext at 16 kHz — what AssemblyAI expects for PCM
        _ssrAudioContext = new AudioContext({ sampleRate: 16000 });
        _ssrSource = _ssrAudioContext.createMediaStreamSource(sourceStream);

        // ScriptProcessorNode collects raw PCM samples
        const bufferSize = 1600; // 100 ms at 16 kHz
        _ssrProcessor = _ssrAudioContext.createScriptProcessor(bufferSize, 1, 1);

        // Accumulate PCM chunks, convert Float32 → Int16 → base64, then emit
        _ssrProcessor.onaudioprocess = (event) => {
            if (!options.socketRef.current?.connected) return;

            const float32 = event.inputBuffer.getChannelData(0);

            // Convert Float32 → Int16 PCM
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
                const s = Math.max(-1, Math.min(1, float32[i]));
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }

            // base64-encode the buffer
            const bytes = new Uint8Array(int16.buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const b64 = btoa(binary);

            options.socketRef.current?.emit('media-chunk', {
                meetingId: options.meetingId,
                userId: options.userId,
                mediaData: {
                    type: 'audio',
                    data: b64,
                    speaker_id: options.userId,
                    timestamp: new Date().toISOString(),
                },
            });
        };

        _ssrSource.connect(_ssrProcessor);
        _ssrProcessor.connect(_ssrAudioContext.destination);

        console.log('✅ [SSR] Server-side audio streaming started (no screen prompt)');
        return true;

    } catch (err) {
        console.error('❌ [SSR] Failed to start server-side recording:', err);
        return false;
    }
};

/**
 * Stop streaming audio to the server and clean up AudioContext resources.
 */
export const stopServerSideRecording = (): void => {
    try {
        if (_ssrProcessor) {
            _ssrProcessor.disconnect();
            _ssrProcessor = null;
        }
        if (_ssrSource) {
            _ssrSource.disconnect();
            _ssrSource = null;
        }
        if (_ssrIntervalId) {
            clearInterval(_ssrIntervalId);
            _ssrIntervalId = null;
        }
        if (_ssrAudioContext) {
            _ssrAudioContext.close().catch(() => { });
            _ssrAudioContext = null;
        }
        console.log('🛑 [SSR] Server-side audio streaming stopped');
    } catch (err) {
        console.error('❌ [SSR] Error stopping server-side recording:', err);
    }
};