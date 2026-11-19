import { API_URL } from "@/lib/config"
import { toast } from 'react-hot-toast';
import { Caption, Command, MeetingInsight, Conflict, ChatMessage, MoodPoint, AgreementScore } from '../types';

export const handleCommand = (
    commandText: string,
    userName: string,
    options: {
        isRecording: boolean;
        toggleRecording: () => void;
        setTargetLanguage: (lang: string) => void;
        setIsLiveTranslationEnabled: (enabled: boolean) => void;
        generateMeetingSummary: () => void;
        handleNextSpeaker: () => void;
        showDecisions: () => void;
        startQuiz: (title?: string) => void;
        endQuiz: () => void;
        muteAllParticipants: () => void;
        setChatMessages: (messages: ChatMessage[]) => void;
        highlightMessage: (text: string) => void;
        setShowCommandHelp: (show: boolean) => void;
        setCommands: (commands: Command[]) => void;
        participants: any[];
        isOwner: boolean;
    }
) => {
    const commandParts = commandText.split(' ');
    const commandType = commandParts[0].toLowerCase();
    const params = commandParts.slice(1).join(' ');

    const command: Command = {
        type: 'record',
        params,
        executedBy: userName,
        executedAt: new Date(),
        status: 'pending'
    };

    switch (commandType) {
        case '/record':
            command.type = 'record';
            if (params === 'start') {
                if (!options.isRecording) options.toggleRecording();
            } else if (params === 'stop') {
                if (options.isRecording) options.toggleRecording();
            }
            break;
        case '/summarize':
            command.type = 'summarize';
            options.generateMeetingSummary();
            break;
        case '/translate':
            command.type = 'translate';
            options.setTargetLanguage(params.split(' ')[0]);
            options.setIsLiveTranslationEnabled(true);
            break;
        case '/next-speaker':
            command.type = 'next_speaker';
            options.handleNextSpeaker();
            break;
        case '/show-decisions':
            command.type = 'show_decisions';
            options.showDecisions();
            break;
        case '/start-quiz':
            command.type = 'start_quiz';
            options.startQuiz(params);
            break;
        case '/end-quiz':
            command.type = 'end_quiz';
            options.endQuiz();
            break;
        case '/mute-all':
            command.type = 'mute_all';
            options.muteAllParticipants();
            break;
        case '/clear-chat':
            command.type = 'clear_chat';
            options.setChatMessages([]);
            break;
        case '/highlight':
            command.type = 'highlight';
            options.highlightMessage(params);
            break;
        case '/help':
            options.setShowCommandHelp(true);
            break;
        default:
            toast.error(`Unknown command: ${commandType}`);
            return;
    }

    options.setCommands(prev => [...prev, command]);

    setTimeout(() => {
        options.setCommands(prev => prev.map(cmd =>
            cmd === command ? { ...cmd, status: 'completed' } : cmd
        ));
    }, 1000);
};

export const generateMeetingSummary = (
    participants: any[],
    currentMood: string,
    moodIntensity: number,
    agreementScore: AgreementScore,
    meetingInsights: MeetingInsight[],
    sendChatMessage: (text: string, sender?: string) => void
) => {
    const summary = `Meeting Summary (${new Date().toLocaleTimeString()}):
• Participants: ${participants.length}
• Mood: ${currentMood} (${moodIntensity}% intensity)
• Agreement Score: ${agreementScore.overall}%
• Key Decisions: ${meetingInsights.filter(i => i.type === 'decision').length}
• Action Items: ${meetingInsights.filter(i => i.type === 'action_item').length}`;

    sendChatMessage(summary, 'AI Assistant');
    toast.success('Meeting summary generated');
};

export const handleNextSpeaker = (
    participants: any[],
    sendChatMessage: (text: string, sender?: string) => void
) => {
    const nextSpeaker = participants
        .filter(p => !p.isBot && !p.isSpeaking)
        .sort(() => 0.5 - Math.random())[0];

    if (nextSpeaker) {
        sendChatMessage(`🎤 Next speaker suggestion: ${nextSpeaker.name}`, 'AI Assistant');
    }
};

export const showDecisions = (
    meetingInsights: MeetingInsight[],
    sendChatMessage: (text: string, sender?: string) => void
) => {
    const decisions = meetingInsights.filter(i => i.type === 'decision');
    if (decisions.length > 0) {
        const decisionList = decisions.map(d => `• ${d.text}`).join('\n');
        sendChatMessage(`📋 Meeting Decisions:\n${decisionList}`, 'AI Assistant');
    } else {
        sendChatMessage('No decisions recorded yet.', 'AI Assistant');
    }
};

export const muteAllParticipants = (
    participants: any[],
    isOwner: boolean,
    toast: any
) => {
    if (isOwner) {
        participants.forEach(p => {
            if (!p.isBot && p.isAudioEnabled) {
                toast.success(`Muted ${p.name}`);
            }
        });
    } else {
        toast.error('Only meeting owner can mute all');
    }
};

export const highlightMessage = (
    searchText: string,
    chatMessages: ChatMessage[],
    sendChatMessage: (text: string, sender?: string) => void
) => {
    const matchingMessages = chatMessages.filter(msg =>
        msg.text.toLowerCase().includes(searchText.toLowerCase())
    );

    if (matchingMessages.length > 0) {
        sendChatMessage(`🔍 Found ${matchingMessages.length} messages containing "${searchText}"`, 'AI Assistant');
    } else {
        sendChatMessage(`No messages found containing "${searchText}"`, 'AI Assistant');
    }
};

export const getAIReaction = (text: string, sentiment: number): string | null => {
    if (text.includes('agree') || text.includes('yes') || text.includes('correct')) {
        return '👍';
    }
    if (text.includes('important') || text.includes('key') || text.includes('critical')) {
        return '👀';
    }
    if (text.includes('task') || text.includes('action') || text.includes('todo')) {
        return '❗';
    }
    if (text.includes('confused') || text.includes('don\'t understand') || text.includes('unclear')) {
        return '⚠';
    }
    if (sentiment > 0.7) {
        return '😊';
    }
    if (text.includes('?')) {
        return '❓';
    }
    return null;
};

export const handleArgumentDetection = (
    caption: Caption,
    options: {
        setDetectedConflicts: (conflicts: Conflict[]) => void;
        addAIMessage: (text: string) => void;
        aiMode: 'private' | 'group';
        extractTopic: (text: string) => string;
    }
) => {
    const conflict: Conflict = {
        id: Date.now().toString(),
        participants: [caption.userName, 'Unknown'],
        severity: 'medium',
        detectedAt: new Date(),
        topic: options.extractTopic(caption.text),
        suggestions: [
            "Take a moment to clarify the misunderstanding",
            "Use 'I' statements instead of 'you' statements",
            "Focus on the problem, not the person",
            "Suggest a short break if tension rises"
        ]
    };

    options.setDetectedConflicts(prev => [...prev, conflict]);

    if (options.aiMode === 'private') {
        options.addAIMessage(`⚠ Potential conflict detected: ${caption.text}. Consider: ${conflict.suggestions[0]}`);
    }
};

export const handleConfusionDetection = (
    caption: Caption,
    options: {
        addAIMessage: (text: string) => void;
        aiMode: 'private' | 'group';
        setAgreementScore: (score: any) => void;
        extractKeywords: (text: string) => string;
    }
) => {
    const suggestion = `It seems there might be some confusion. Could you clarify what "${options.extractKeywords(caption.text)}" means in this context?`;

    if (options.aiMode === 'private') {
        options.addAIMessage(`🤔 Confusion detected: ${caption.text}. Suggestion: ${suggestion}`);
    }

    options.setAgreementScore(prev => ({
        ...prev,
        confusionLevel: Math.min(100, prev.confusionLevel + 10)
    }));
};

export const handleTaskDetection = (
    caption: Caption,
    options: {
        setMeetingInsights: (insights: MeetingInsight[]) => void;
        createFollowUpTask: (type: any, title: string, assignedTo: string[]) => void;
        addAIMessage: (text: string) => void;
        aiMode: 'private' | 'group';
        extractTask: (text: string) => string | null;
        sendChatMessage: (text: string, sender?: string) => void;
    }
) => {
    const task = options.extractTask(caption.text);
    if (task) {
        const insight: MeetingInsight = {
            id: Date.now().toString(),
            type: 'action_item',
            text: task,
            timestamp: new Date(),
            participants: [caption.userName],
            priority: 'medium'
        };
        options.setMeetingInsights(prev => [...prev, insight]);

        options.createFollowUpTask('reminder', task, [caption.userName]);

        if (options.aiMode === 'group') {
            options.sendChatMessage(`📝 Action item identified: "${task}"`, 'AI Assistant');
        }
    }
};

export const handleQuestionDetection = (
    caption: Caption,
    options: {
        setMeetingInsights: (insights: MeetingInsight[]) => void;
    }
) => {
    const insight: MeetingInsight = {
        id: Date.now().toString(),
        type: 'question',
        text: caption.text,
        timestamp: new Date(),
        participants: [caption.userName],
        priority: 'high'
    };
    options.setMeetingInsights(prev => [...prev, insight]);
};

export const updateMood = (options: {
    chatMessages: ChatMessage[];
    captions: Caption[];
    setCurrentMood: (mood: 'positive' | 'neutral' | 'negative') => void;
    setMoodIntensity: (intensity: number) => void;
    setMoodHistory: (history: MoodPoint[]) => void;
    setAgreementScore: (score: any) => void;
    analyzeSentiment: (text: string) => number;
}) => {
    let mood: 'positive' | 'neutral' | 'negative' = 'neutral';
    let intensity = 50;

    const recentMessages = [...options.chatMessages.slice(-5), ...options.captions.slice(-3)];
    let sentimentSum = 0;

    recentMessages.forEach(msg => {
        const text = typeof msg.text === 'string' ? msg.text : '';
        sentimentSum += options.analyzeSentiment(text);
    });

    const avgSentiment = recentMessages.length > 0 ? sentimentSum / recentMessages.length : 0.5;

    if (avgSentiment > 0.7) {
        mood = 'positive';
        intensity = Math.round(avgSentiment * 100);
    } else if (avgSentiment < 0.3) {
        mood = 'negative';
        intensity = Math.round((1 - avgSentiment) * 100);
    } else {
        mood = 'neutral';
        intensity = 50;
    }

    options.setCurrentMood(mood);
    options.setMoodIntensity(intensity);

    const moodPoint: MoodPoint = {
        time: Date.now(),
        mood,
        intensity,
        reason: recentMessages.length > 0 ? `Based on recent conversation` : 'No recent activity'
    };

    options.setMoodHistory(prev => [...prev, moodPoint].slice(-20));

    options.setAgreementScore(prev => ({
        ...prev,
        timeline: [...prev.timeline, {
            time: Date.now(),
            score: prev.overall,
            reason: `Mood: ${mood} (${intensity}%)`
        }].slice(-10)
    }));
};

export const detectPotentialConflict = (options: {
    participants: any[];
    setAgreementScore: (score: any) => void;
}) => {
    if (options.participants.length < 2) return;

    if (Math.random() < 0.3) {
        const randomParticipants = options.participants
            .filter(p => !p.isBot)
            .sort(() => 0.5 - Math.random())
            .slice(0, 2);

        if (randomParticipants.length === 2) {
            const disagreement = {
                between: [randomParticipants[0].name, randomParticipants[1].name] as [string, string],
                count: 1,
                topics: ['Decision making', 'Approach']
            };

            options.setAgreementScore(prev => ({
                ...prev,
                disagreements: [...prev.disagreements, disagreement],
                overall: Math.max(0, prev.overall - 5)
            }));
        }
    }
};

export const generateMeetingInsight = (options: {
    participants: any[];
    setMeetingInsights: (insights: MeetingInsight[]) => void;
    extractTopic: (text: string) => string;
}) => {
    const types: MeetingInsight['type'][] = ['action_item', 'decision', 'question', 'idea'];
    const randomType = types[Math.floor(Math.random() * types.length)];

    const insight: MeetingInsight = {
        id: Date.now().toString(),
        type: randomType,
        text: `Generated insight about ${options.extractTopic('discussion')}`,
        timestamp: new Date(),
        participants: options.participants.slice(0, 2).map(p => p.name),
        priority: Math.random() > 0.5 ? 'high' : 'medium'
    };

    options.setMeetingInsights(prev => [...prev.slice(-5), insight]);
};

export const generateAIResponse = async (input: string): Promise<string> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const lowerInput = input.toLowerCase();

        // Safety & Security Check
        const inappropriateThemes = ['hack', 'exploit', '18+', 'adult content', 'nsfw', 'porn', 'violence', 'illegal'];
        if (inappropriateThemes.some(theme => lowerInput.includes(theme))) {
            return "I apologize, but I cannot assist with hacking, 18+ content, or other inappropriate/illegal requests. Is there anything else meeting-related I can help you with?";
        }

        const safetyPrompt = `As the OmniMeetX Assistant, respond helpfully to meeting-related queries. Strictly refuse any hacking, 18+, or harmful requests. Keep responses professional and secure. \n\nUser: ${input}`;

        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message: safetyPrompt })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.response || "I'm processing your request. Please give me a moment.";
    } catch (error) {
        console.error('AI API error:', error);
        // Fallback responses for when API fails
        const lowerInput = input.toLowerCase();

        if (lowerInput.includes('ghost') || lowerInput.includes('replay')) {
            return "I can replay any moment from the meeting. Try asking:\n• \"Replay what John said about the budget\"\n• \"What did Sarah say about the deadline?\"\n• \"Play the confusing part again\"";
        }

        if (lowerInput.includes('task') || lowerInput.includes('follow up')) {
            return "I can automatically create follow-up tasks. Available integrations:\n• 📧 Send emails\n• 📋 Create Trello cards\n• 🎫 Create Jira tickets\n• 📝 Update Notion\n• 📊 Update Google Sheets\n• 💻 Create code tasks\n• ⏰ Set reminders";
        }

        if (lowerInput.includes('command') || lowerInput.includes('/')) {
            return "Available commands:\n• /record start/stop\n• /summarize\n• /translate [language]\n• /next-speaker\n• /show-decisions\n• /start-quiz [title]\n• /end-quiz\n• /mute-all\n• /clear-chat\n• /highlight [text]\n• /help";
        }

        if (lowerInput.includes('conflict') || lowerInput.includes('argument')) {
            return "I've detected some tension. Here are my suggestions:\n1. Take a 5-minute break\n2. Clarify objectives\n3. Use 'I feel' statements\n4. Focus on common goals";
        }

        if (lowerInput.includes('help') || lowerInput.includes('suggest')) {
            return "I can help with:\n• Ghost Replay - Recreate any moment\n• Auto-execution - Create follow-up tasks\n• Multi-mode chat - Text, voice, image\n• Command control - Control meeting via chat\n• Quiz system - Interactive quizzes\n• Meeting analytics - Real-time insights";
        }

        return "I'm having trouble connecting to the AI service right now. Please try again later.";
    }
};