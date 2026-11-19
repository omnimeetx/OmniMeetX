import { Participant, Caption, ChatMessage, QuizQuestion, QuizAnswer } from '../types';

export const getCurrentUserId = (): string => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.sub || payload.userId || 'user_' + Math.random().toString(36).substr(2, 9);
        } catch (e) {
            return 'user_' + Math.random().toString(36).substr(2, 9);
        }
    }
    return 'user_' + Math.random().toString(36).substr(2, 9);
};

export const createLocalVideoPlaceholder = (userName: string) => {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const context = canvas.getContext('2d');

        if (context) {
            const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#1c1c17');
            gradient.addColorStop(1, '#141410');
            context.fillStyle = gradient;
            context.fillRect(0, 0, canvas.width, canvas.height);

            context.fillStyle = '#c0e86a';
            context.font = 'bold 100px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(userName.charAt(0).toUpperCase(), canvas.width / 2, canvas.height / 2);
        }

        const stream = canvas.captureStream(0);
        return stream;
    } catch (error) {
        console.error('Failed to create placeholder:', error);
        return null;
    }
};

export const analyzeSentiment = (text: string): number => {
    const positiveWords = ['good', 'great', 'excellent', 'agree', 'yes', 'perfect', 'awesome', 'happy'];
    const negativeWords = ['bad', 'terrible', 'no', 'disagree', 'wrong', 'problem', 'issue', 'angry'];

    const words = text.toLowerCase().split(' ');
    let score = 0.5;

    positiveWords.forEach(word => {
        if (words.includes(word)) score += 0.1;
    });

    negativeWords.forEach(word => {
        if (words.includes(word)) score -= 0.1;
    });

    return Math.max(0, Math.min(1, score));
};

export const extractTopic = (text: string): string => {
    const topics = ['deadline', 'budget', 'design', 'implementation', 'strategy', 'team', 'client'];
    for (const topic of topics) {
        if (text.toLowerCase().includes(topic)) {
            return topic;
        }
    }
    return 'General discussion';
};

export const extractKeywords = (text: string): string => {
    const words = text.toLowerCase().split(' ');
    const importantWords = words.filter(word => word.length > 5);
    return importantWords.slice(0, 3).join(', ') || text.slice(0, 30);
};

export const extractTask = (text: string): string | null => {
    const taskRegex = /(need to|should|must|task|action)\s+(.+?)(\.|$)/i;
    const match = text.match(taskRegex);
    return match ? match[2].trim() : null;
};

export const getGridClass = (count: number): string => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-3';
    if (count === 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-3';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
};

export const getVideoContainerClass = (isSpeaking: boolean, isSpotlight: boolean): string => {
    let classes = 'relative rounded-2xl overflow-hidden glass-card group aspect-video transition-all duration-300';

    if (isSpotlight) {
        classes += ' ring-4 ring-yellow-400 ring-opacity-80 scale-105 z-10';
    } else if (isSpeaking) {
        // Gradient border effect using pseudo-elements or specific ring utilities if Tailwind config supports it.
        // Since we can't easily do gradient rings in vanilla Tailwind without plugins, we'll use a shadow and border combo
        // or a custom class if we were editing global css. Here, we'll simulate it with a strong colored shadow and border.
        classes += ' ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent scale-[1.02] shadow-[0_0_40px_rgba(99,102,241,0.6)] border-2 border-indigo-400 z-10';
    }

    return classes;
};

export const copyMeetingLink = async (meetingId: string) => {
    const link = `${window.location.origin}/meeting/${meetingId}`;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(link);
        } else {
            const el = document.createElement('textarea');
            el.value = link;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        return { success: true, message: 'Meeting link copied to clipboard' };
    } catch (err) {
        console.error('Failed to copy meeting link', err);
        return { success: false, message: 'Could not copy meeting link' };
    }
};