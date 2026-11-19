import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users2, MessageSquare, Brain, GraduationCap, ListChecks } from 'lucide-react';
import ChatPanel from './ChatPanel';
import AIPanel from './AIPanel';
import QuizPanel from './QuizPanel';
import ParticipantsPanel from './ParticipantsPanel';
import TasksPanel from './TasksPanel';

interface SidebarProps {
    isSidebarOpen: boolean;
    activeTab: 'participants' | 'chat' | 'ai' | 'insights' | 'quiz' | 'tasks';
    setActiveTab: (tab: 'participants' | 'chat' | 'ai' | 'insights' | 'quiz' | 'tasks') => void;
    participants: any[];
    chatMessages: any[];
    chatInput: string;
    setChatInput: (value: string) => void;
    handleChatSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    aiMessages: any[];
    aiChatInput: string;
    setAiChatInput: (value: string) => void;
    sendAIChatMessage: (e: React.FormEvent) => void;
    ghostReplays: any[];
    requestGhostReplay: (query: string) => void;
    activeGhostReplay: string | null;
    isOwner: boolean;
    userName: string;
    quizSession: any;
    currentQuestion: any;
    currentAnswer: string;
    setCurrentAnswer: (value: string) => void;
    submitQuizAnswer: () => void;
    quizTimer: number | null;
    participantsData: any[];
    emotionData: { [key: string]: string };
    activeReactions: { [key: string]: string };
    followUpTasks: any[];
    meetingInsights: any[];
    speakingDistribution: { [key: string]: number };
    dominantSpeaker: string;
    chatScrollRef: React.RefObject<HTMLDivElement>;
    messageReactions: { [key: string]: { [emoji: string]: number } };
    sendMessageReaction: (messageId: string, emoji: string) => void;
    pinnedMessage: any;
    setPinnedMessage: (message: any) => void;
    liveTranscript: any[];
    onOpenNewQuestionForm: () => void;
    isVideoEnabled?: boolean;
    isAudioEnabled?: boolean;
    isScreenSharing?: boolean;
    isMobile?: boolean;
    unreadCounts?: { [key: string]: number };
    onTabClick?: (tab: string) => void;
    socketRef?: React.MutableRefObject<any>;
    meetingId?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
    isSidebarOpen,
    activeTab,
    setActiveTab,
    participants,
    chatMessages,
    chatInput,
    setChatInput,
    handleChatSubmit,
    aiMessages,
    aiChatInput,
    setAiChatInput,
    sendAIChatMessage,
    ghostReplays,
    requestGhostReplay,
    activeGhostReplay,
    isOwner,
    userName,
    quizSession,
    currentQuestion,
    currentAnswer,
    setCurrentAnswer,
    submitQuizAnswer,
    quizTimer,
    participantsData,
    emotionData,
    activeReactions,
    followUpTasks,
    meetingInsights,
    speakingDistribution,
    dominantSpeaker,
    chatScrollRef,
    messageReactions,
    sendMessageReaction,
    pinnedMessage,
    setPinnedMessage,
    liveTranscript,
    onOpenNewQuestionForm,
    isVideoEnabled = true,
    isAudioEnabled = true,
    isScreenSharing = false,
    isMobile = false,
    unreadCounts = {},
    onTabClick,
    socketRef,
    meetingId
}) => {
    const tabs = [
        { id: 'participants', icon: Users2, label: 'People' },
        { id: 'chat', icon: MessageSquare, label: 'Chat' },
        { id: 'ai', icon: Brain, label: 'AI' },
        { id: 'quiz', icon: GraduationCap, label: 'Quiz' },
        { id: 'tasks', icon: ListChecks, label: 'Tasks' },
    ];

    // Notification Logic — WhatsApp style (Fix 7)
    // Only show dot when unreadCounts[tab] > 0
    // unreadCounts is managed by page.tsx and reset to 0 when tab is clicked

    // Activity Log Logic (Lifted State)
    const [activityLog, setActivityLog] = React.useState<any[]>([]);
    const prevParticipantIdsRef = React.useRef<Set<string>>(new Set());
    const prevHostIdRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        // Construct allParticipants for tracking (including local user)
        const allParticipantsForTracking = [
            {
                id: 'local',
                name: `${userName} (Me)`,
                isOwner: isOwner,
            },
            ...participantsData
        ];

        const currentIds = new Set(allParticipantsForTracking.map(p => p.id));
        const prevParticipantIds = prevParticipantIdsRef.current;

        // Check for new participants (joined)
        currentIds.forEach(id => {
            if (!prevParticipantIds.has(id)) {
                const participant = allParticipantsForTracking.find(p => p.id === id);
                if (participant) {
                    const newEntry = {
                        id: `${id}-${Date.now()}`,
                        participantName: participant.name,
                        action: 'joined',
                        timestamp: new Date()
                    };

                    // Prevent duplicates
                    setActivityLog(prev => {
                        const lastEntry = prev[0];
                        if (lastEntry &&
                            lastEntry.participantName === newEntry.participantName &&
                            lastEntry.action === newEntry.action &&
                            (newEntry.timestamp.getTime() - lastEntry.timestamp.getTime() < 2000)) {
                            return prev;
                        }
                        return [newEntry, ...prev].slice(0, 30);
                    });
                }
            }
        });

        // Check for removed participants (left)
        prevParticipantIds.forEach(id => {
            if (!currentIds.has(id)) {
                const participantName = 'Participant';
                const newEntry = {
                    id: `${id}-${Date.now()}`,
                    participantName,
                    action: 'left',
                    timestamp: new Date()
                };

                setActivityLog(prev => {
                    // Start of duplicate check logic (simplified for 'left' as we might not have name easily, 
                    // but we can check action and timestamp if needed, or just rely on Ref sync)
                    // With Sync Ref, duplicates should be rare. But let's be safe.
                    return [newEntry, ...prev].slice(0, 30);
                });
            }
        });

        // Check for host changes
        const currentHost = allParticipantsForTracking.find(p => p.isOwner);
        const currentHostId = currentHost?.id || null;
        const prevHostId = prevHostIdRef.current;

        if (prevHostId !== null && currentHostId !== prevHostId && currentHost) {
            const newEntry = {
                id: `host-${currentHostId}-${Date.now()}`,
                participantName: currentHost.name,
                action: 'became_host',
                timestamp: new Date()
            };
            setActivityLog(prev => [newEntry, ...prev].slice(0, 30));
        }

        prevParticipantIdsRef.current = currentIds;
        prevHostIdRef.current = currentHostId;
    }, [participantsData, isOwner, userName]);

    return (
        <motion.div
            className={`absolute top-0 right-0 h-full border-l border-line z-40 flex flex-col bg-canvas/95 backdrop-blur-2xl transition-all duration-300 ${isMobile ? 'w-full left-0 border-l-0 mobile-sidebar' : 'w-96 glass-panel'
                }`}
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile
                ? { y: isSidebarOpen ? 0 : "100%" }
                : { x: isSidebarOpen ? 0 : "100%" }
            }
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
            <div className={`flex items-center justify-around p-4 border-b border-line ${isMobile ? 'mobile-tab-bar' : ''}`}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;

                    // Unified distinct theme matching navbar with gradients
                    const getTabColor = (id: string) => {
                        // All tabs now share the premium navbar aesthetic but can have subtle variations if needed
                        // or strict uniformity if that's the goal. Let's use the requested "navbar like" style
                        // which implies the primary/accent gradient.
                        return 'text-white bg-primary/10 border border-line';
                    };

                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                if (onTabClick) onTabClick(tab.id);
                            }}
                            className={`relative p-3 rounded-xl transition-all duration-300 group overflow-hidden ${isActive
                                ? `${getTabColor(tab.id)} scale-105`
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                            title={tab.label}
                        >
                            {/* Active background glow effect similar to navbar logo */}
                            {isActive && (
                                <div className="absolute inset-0 bg-primary/10 blur-xl"></div>
                            )}

                            <div className="relative z-10 flex items-center justify-center">
                                <tab.icon size={22} className={`transition-transform duration-300 ${isActive ? 'scale-110 text-accent' : 'group-hover:scale-110 group-hover:text-primary'}`} />
                            </div>

                            {/* Unread count badge — WhatsApp style with pulse */}
                            {(unreadCounts[tab.id] || 0) > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [1, 1.15, 1] }}
                                    transition={{ duration: 0.6, repeat: 2 }}
                                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-canvas z-20 px-1"
                                >
                                    {unreadCounts[tab.id] > 99 ? '99+' : unreadCounts[tab.id]}
                                </motion.span>
                            )}

                            {isActive && (
                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent opacity-50 z-20" />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-col h-full overflow-hidden">
                {/* Sidebar Content */}
                <div className="flex-1 overflow-y-auto p-4 meeting-scrollable">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="h-full"
                        >
                            {activeTab === 'ai' ? (
                                <AIPanel
                                    aiMessages={aiMessages}
                                    aiChatInput={aiChatInput}
                                    setAiChatInput={setAiChatInput}
                                    sendAIChatMessage={sendAIChatMessage}
                                    ghostReplays={ghostReplays}
                                    requestGhostReplay={requestGhostReplay}
                                    activeGhostReplay={activeGhostReplay}
                                    liveTranscript={liveTranscript}
                                />
                            ) : activeTab === 'quiz' ? (
                                <QuizPanel
                                    isOwner={isOwner}
                                    userName={userName}
                                    quizSession={quizSession}
                                    currentQuestion={currentQuestion}
                                    currentAnswer={currentAnswer}
                                    setCurrentAnswer={setCurrentAnswer}
                                    submitQuizAnswer={submitQuizAnswer}
                                    quizTimer={quizTimer}
                                    participants={participants}
                                    onOpenNewQuestionForm={onOpenNewQuestionForm}
                                    socketRef={socketRef}
                                    meetingId={meetingId}
                                    liveTranscript={liveTranscript}
                                />
                            ) : activeTab === 'tasks' ? (
                                <TasksPanel
                                    followUpTasks={followUpTasks}
                                    meetingInsights={meetingInsights}
                                    speakingDistribution={speakingDistribution}
                                    participants={participants}
                                    dominantSpeaker={dominantSpeaker}
                                />
                            ) : activeTab === 'participants' ? (
                                <ParticipantsPanel
                                    participants={participantsData}
                                    emotionData={emotionData}
                                    activeReactions={activeReactions}
                                    userName={userName}
                                    isOwner={isOwner}
                                    isVideoEnabled={isVideoEnabled}
                                    isAudioEnabled={isAudioEnabled}
                                    isScreenSharing={isScreenSharing}
                                    activityLog={activityLog}
                                />
                            ) : (
                                <ChatPanel
                                    chatMessages={chatMessages}
                                    chatInput={chatInput}
                                    setChatInput={setChatInput}
                                    handleChatSubmit={handleChatSubmit}
                                    userName={userName}
                                    chatScrollRef={chatScrollRef}
                                    messageReactions={messageReactions}
                                    sendMessageReaction={sendMessageReaction}
                                    pinnedMessage={pinnedMessage}
                                    setPinnedMessage={setPinnedMessage}
                                    socketRef={socketRef}
                                    meetingId={meetingId}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

export default Sidebar;