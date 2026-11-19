// All interfaces from your original code
export interface Participant {
    id: string;
    name: string;
    email?: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isSpeaking: boolean;
    isHandRaised: boolean;
    isBot?: boolean;
    isTeacher?: boolean;
    isScreenSharing?: boolean;
    speakingTime?: number;
    emotion?: string;
    agreementScore?: number;
    role?: string;
    connectionQuality?: 'good' | 'average' | 'poor';
    voiceSignature?: string;
    quizScore?: number;
    correctAnswers?: number;
    totalAttempts?: number;
    isOwner?: boolean;
}

export interface TranscriptEntry {
    id: string;
    speaker: string;
    userId: string;
    text: string;
    timestamp: string;
    raw_speaker?: string;
}

export interface Caption {
    id: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: Date;
    language: string;
    sentiment?: number;
    emotion?: string;
    translatedText?: string;
    audioClip?: string;
}

export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: Date;
    isAI?: boolean;
    aiReaction?: string;
    isTranslated?: boolean;
    isCommand?: boolean;
    commandType?: string;
    attachment?: {
        type: 'image' | 'audio' | 'document';
        url: string;
        name?: string;
    };
    reaction?: string;
    reactionCount?: number;
    isReaction?: boolean;
}

export interface MoodPoint {
    time: number;
    mood: 'positive' | 'neutral' | 'negative';
    intensity: number;
    reason?: string;
}

export interface Conflict {
    id: string;
    participants: string[];
    severity: 'low' | 'medium' | 'high';
    detectedAt: Date;
    topic: string;
    resolved?: boolean;
    suggestions: string[];
}

export interface AgreementScore {
    overall: number;
    clarity: number;
    alignment: number;
    disagreements: Array<{
        between: [string, string];
        count: number;
        topics: string[];
    }>;
    confusionLevel: number;
    timeline: Array<{
        time: number;
        score: number;
        reason: string;
    }>;
}

export interface MeetingInsight {
    id: string;
    type: 'action_item' | 'decision' | 'question' | 'idea' | 'task';
    text: string;
    timestamp: Date;
    participants: string[];
    priority: 'low' | 'medium' | 'high';
    assignedTo?: string;
    dueDate?: Date;
    status?: 'pending' | 'in_progress' | 'completed';
}

export interface GhostReplay {
    id: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: Date;
    audioUrl?: string;
    context: string;
    isPlaying: boolean;
}

export interface FollowUpTask {
    id: string;
    type: 'trello' | 'jira' | 'email' | 'notion' | 'sheets' | 'code' | 'reminder';
    title: string;
    description: string;
    assignedTo: string[];
    dueDate?: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    metadata?: any;
}

export interface QuizQuestion {
    id: string;
    question: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer' | 'code' | 'image' | 'audio';
    options?: string[];
    correctAnswer: string | number | string[];
    points: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    timeLimit?: number;
    createdAt: Date;
    createdBy: string;
    tags: string[];
    explanation?: string;
    hint?: string;
    aiGenerated?: boolean;
    category?: string;
    imageUrl?: string;
    audioUrl?: string;
    codeLanguage?: string;
    isPublic: boolean;
    targetUserIds?: string[];
    attemptsAllowed?: number;
}

export interface QuizAnswer {
    id: string;
    questionId: string;
    userId: string;
    userName: string;
    answer: string | number | string[];
    isCorrect: boolean;
    submittedAt: Date;
    timeTaken: number;
    confidence?: number;
    aiFeedback?: string;
    attemptNumber: number;
}

export interface QuizSession {
    id: string;
    title: string;
    description?: string;
    questions: QuizQuestion[];
    answers: QuizAnswer[];
    isActive: boolean;
    startedAt: Date;
    endedAt?: Date;
    settings: {
        shuffleQuestions: boolean;
        showResults: boolean;
        allowRetry: boolean;
        timeLimit?: number;
        passingScore: number;
        showLeaderboard: boolean;
    };
    participants: string[];
    leaderboard?: Array<{
        userId: string;
        userName: string;
        score: number;
        correct: number;
        total: number;
        timeSpent: number;
        rank: number;
    }>;
}

export interface QuizAnalytics {
    questionAnalytics: {
        questionId: string;
        correctPercentage: number;
        avgTime: number;
        difficultyScore: number;
        commonWrongAnswers: string[];
    }[];
    participantAnalytics: {
        userId: string;
        engagementScore: number;
        improvementRate: number;
        weakAreas: string[];
        strongAreas: string[];
    }[];
    overallStats: {
        averageScore: number;
        completionRate: number;
        timeSpentAverage: number;
        questionDifficultyDistribution: Record<string, number>;
    };
}

export interface Command {
    type: 'record' | 'summarize' | 'translate' | 'next_speaker' | 'show_decisions' | 'start_quiz' | 'end_quiz' | 'mute_all' | 'clear_chat' | 'highlight';
    params?: any;
    executedBy: string;
    executedAt: Date;
    status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface FloatingEmoji {
    id: string;
    emoji: string;
    x: number;
    y: number;
    userId?: string;
    userName?: string;
}

export interface MeetingState {
    participants: Participant[];
    captions: Caption[];
    chatMessages: ChatMessage[];
    chatInput: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    isRecording: boolean;
    selectedLanguage: string;
    targetLanguage: string;
    userName: string;
    userEmail: string;
    isCaptionsEnabled: boolean;
    isLiveTranslationEnabled: boolean;
    isHandRaised: boolean;
    isSidebarOpen: boolean;
    activeTab: 'participants' | 'chat' | 'ai' | 'insights' | 'quiz' | 'tasks';
    showControls: boolean;
    showPostMeetingPopup: boolean;
    recordedBlob: Blob | null;
    isUploading: boolean;
    uploadProgress: number;
    popupTitle: string;
    popupLanguage: string;
    isOwner: boolean;
    meeting: any;
    autoRecord: boolean;
    isConnectionQualityVisible: boolean;
    pinnedMessage: ChatMessage | null;
    isBackgroundBlurred: boolean;
    videoLayout: 'grid' | 'speaker' | 'immersive';
    aiMode: 'private' | 'group';
    isAIEnabled: boolean;
    aiSensitivity: number;
    moodHistory: MoodPoint[];
    currentMood: 'positive' | 'neutral' | 'negative';
    moodIntensity: number;
    detectedConflicts: Conflict[];
    agreementScore: AgreementScore;
    aiChatInput: string;
    aiMessages: ChatMessage[];
    isAIChatOpen: boolean;
    aiInsights: string[];
    emotionData: { [key: string]: string };
    meetingInsights: MeetingInsight[];
    dominantSpeaker: string;
    speakingDistribution: { [key: string]: number };
    ghostReplays: GhostReplay[];
    activeGhostReplay: string | null;
    followUpTasks: FollowUpTask[];
    chatMode: 'text' | 'voice' | 'image';
    isRecordingVoice: boolean;
    voiceRecording: Blob | null;
    selectedImage: string | null;
    commands: Command[];
    showCommandHelp: boolean;
    quizSession: QuizSession;
    currentQuestion: QuizQuestion | null;
    currentAnswer: string;
    userAnswers: { [key: string]: QuizAnswer };
    quizTimer: number | null;
    showQuestionPopup: boolean;
    showAnswerPopup: boolean;
    selectedAnswer: QuizAnswer | null;
    selectedUserForPrivateQuestion: string | null;
    quizAnalytics: QuizAnalytics | null;
    leaderboard: Array<{
        userId: string;
        userName: string;
        score: number;
        correct: number;
        total: number;
        timeSpent: number;
        rank: number;
    }>;
    newQuizQuestion: {
        question: string;
        type: QuizQuestion['type'];
        options: string[];
        correctAnswer: string;
        points: number;
        difficulty: QuizQuestion['difficulty'];
        timeLimit: number;
        tags: string[];
        explanation: string;
        hint: string;
        isPublic: boolean;
        targetUserIds: string[];
        attemptsAllowed: number;
        category: string;
        aiGenerated: boolean;
    };
    showNewQuestionForm: boolean;
    activeQuestionTab: 'public' | 'private' | 'ai';
    quizMode: 'practice' | 'test' | 'competitive';
    quizFilter: 'all' | 'unanswered' | 'incorrect';
    showAnalytics: boolean;
    aiSuggestions: string[];
    isGeneratingAIQuestion: boolean;
    aiDifficulty: 'easy' | 'medium' | 'hard';
    aiTopic: string;
    floatingEmojis: FloatingEmoji[];
    aiGeneratedQuestions: QuizQuestion[];
    isSpeaking: boolean;
    showReactionPicker: boolean;
    messageReactions: { [key: string]: { [emoji: string]: number } };
    activeReactions: { [key: string]: string };
}

export interface ActivityEntry {
    id: string;
    participantName: string;
    action: 'joined' | 'left' | 'became_host';
    timestamp: Date;
}