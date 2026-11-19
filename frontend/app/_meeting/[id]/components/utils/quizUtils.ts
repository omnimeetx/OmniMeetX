import { API_URL } from "@/lib/config"
import { toast } from 'react-hot-toast';
import { QuizSession, QuizQuestion, QuizAnswer, Participant, QuizAnalytics } from '../types';

export const sendQuizQuestion = (options: {
    newQuizQuestion: any;
    setQuizSession: (session: any) => void;
    setCurrentQuestion: (question: QuizQuestion | null) => void;
    setQuizTimer: (timer: number | null) => void;
    setNewQuizQuestion: (question: any) => void;
    socketRef: any;
    meetingId: string;
    userName: string;
    isOwner: boolean;
    setShowNewQuestionForm: (show: boolean) => void;
}) => {
    if (!options.newQuizQuestion.question.trim()) {
        toast.error('Please enter a question');
        return;
    }

    if (options.newQuizQuestion.type === 'multiple_choice' && options.newQuizQuestion.options.some((opt: string) => !opt.trim())) {
        toast.error('Please fill all options for multiple choice');
        return;
    }

    const question: QuizQuestion = {
        id: Date.now().toString(),
        question: options.newQuizQuestion.question,
        type: options.newQuizQuestion.type,
        options: options.newQuizQuestion.type === 'multiple_choice' ? options.newQuizQuestion.options : undefined,
        correctAnswer: options.newQuizQuestion.correctAnswer,
        points: options.newQuizQuestion.points,
        difficulty: options.newQuizQuestion.difficulty,
        timeLimit: options.newQuizQuestion.timeLimit,
        createdAt: new Date(),
        createdBy: options.userName,
        tags: options.newQuizQuestion.tags,
        explanation: options.newQuizQuestion.explanation,
        hint: options.newQuizQuestion.hint,
        aiGenerated: options.newQuizQuestion.aiGenerated,
        isPublic: options.newQuizQuestion.isPublic,
        targetUserIds: options.newQuizQuestion.isPublic ? undefined : options.newQuizQuestion.targetUserIds,
        attemptsAllowed: options.newQuizQuestion.attemptsAllowed,
        category: options.newQuizQuestion.category
    };

    (options.setQuizSession as any)((prev: QuizSession) => ({
        ...prev,
        questions: [...prev.questions, question]
    }));

    options.socketRef?.current?.emit('quiz-question', {
        ...question,
        meetingId: options.meetingId
    });

    if (question.isPublic || question.targetUserIds?.includes('user')) {
        options.setCurrentQuestion(question);
        options.setQuizTimer(question.timeLimit || 60);
    }

    options.setNewQuizQuestion({
        question: '',
        type: 'multiple_choice',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 10,
        difficulty: 'medium',
        timeLimit: 60,
        tags: [],
        explanation: '',
        hint: '',
        isPublic: true,
        targetUserIds: [],
        attemptsAllowed: 1,
        category: 'General',
        aiGenerated: false
    });

    options.setShowNewQuestionForm(false);
    toast.success('Question sent to participants!');
};

export const submitQuizAnswer = (options: {
    currentQuestion: QuizQuestion | null;
    currentAnswer: string;
    quizSession: QuizSession;
    setQuizSession: (session: any) => void;
    setCurrentAnswer: (answer: string) => void;
    setCurrentQuestion: (question: QuizQuestion | null) => void;
    setQuizTimer: (timer: number | null) => void;
    quizTimer: number | null;
    socketRef: any;
    meetingId: string;
    userName: string;
    isOwner: boolean;
    updateQuizAnalytics: () => void;
}) => {
    if (!options.currentQuestion || !options.currentAnswer.trim()) {
        toast.error('Please enter your answer');
        return;
    }

    let isCorrect = false;
    if (options.currentQuestion.type === 'multiple_choice') {
        isCorrect = options.currentAnswer === options.currentQuestion.correctAnswer.toString();
    } else if (options.currentQuestion.type === 'true_false') {
        isCorrect = options.currentAnswer === options.currentQuestion.correctAnswer;
    } else {
        isCorrect = options.currentAnswer.toLowerCase() === (options.currentQuestion.correctAnswer as string).toLowerCase();
    }

    const answer: QuizAnswer = {
        id: Date.now().toString(),
        questionId: options.currentQuestion.id,
        userId: 'user',
        userName: options.userName,
        answer: options.currentAnswer,
        isCorrect,
        submittedAt: new Date(),
        timeTaken: options.currentQuestion.timeLimit ? (options.currentQuestion.timeLimit - (options.quizTimer || 0)) : 0,
        confidence: Math.floor(Math.random() * 100),
        aiFeedback: isCorrect ? 'Great job!' : 'Try again!',
        attemptNumber: 1
    };

    (options.setQuizSession as any)((prev: QuizSession) => ({
        ...prev,
        answers: [...prev.answers, answer]
    }));

    options.socketRef?.current?.emit('quiz-answer', {
        ...answer,
        meetingId: options.meetingId
    });

    if (isCorrect) {
        toast.success('Correct answer! 🎉');
        options.setCurrentAnswer('');

        if (options.isOwner && options.quizSession.questions.length > 1) {
            const currentIndex = options.quizSession.questions.findIndex(q => q.id === options.currentQuestion!.id);
            if (currentIndex < options.quizSession.questions.length - 1) {
                options.setCurrentQuestion(options.quizSession.questions[currentIndex + 1]);
                options.setQuizTimer(options.quizSession.questions[currentIndex + 1].timeLimit || 60);
            }
        }
    } else {
        toast.error('Incorrect answer. Try again!');
        if (options.currentQuestion.attemptsAllowed && options.currentQuestion.attemptsAllowed > 1) {
            toast.success(`You have ${options.currentQuestion.attemptsAllowed - 1} more attempts`);
        }
    }

    options.updateQuizAnalytics();
};

export const updateLeaderboard = (options: {
    quizSession: QuizSession;
    participants: Participant[];
    setLeaderboard: (leaderboard: any[]) => void;
}) => {
    const participantScores: {
        [key: string]: {
            userId: string;
            userName: string;
            score: number;
            correct: number;
            total: number;
            timeSpent: number;
        }
    } = {};

    options.quizSession.answers.forEach(answer => {
        if (!participantScores[answer.userId]) {
            const participant = options.participants.find(p => p.id === answer.userId);
            participantScores[answer.userId] = {
                userId: answer.userId,
                userName: participant?.name || answer.userName,
                score: 0,
                correct: 0,
                total: 0,
                timeSpent: 0
            };
        }

        participantScores[answer.userId].total++;
        participantScores[answer.userId].timeSpent += answer.timeTaken;

        if (answer.isCorrect) {
            participantScores[answer.userId].score += 10;
            participantScores[answer.userId].correct++;
        }
    });

    const sortedScores = Object.values(participantScores)
        .sort((a, b) => b.score - a.score)
        .map((item, index) => ({
            ...item,
            rank: index + 1
        }));

    options.setLeaderboard(sortedScores);
};

export const updateQuizAnalytics = (options: {
    quizSession: QuizSession;
    participants: Participant[];
    setQuizAnalytics: (analytics: QuizAnalytics | null) => void;
}) => {
    const questionAnalytics = options.quizSession.questions.map(question => {
        const questionAnswers = options.quizSession.answers.filter(a => a.questionId === question.id);
        const correctCount = questionAnswers.filter(a => a.isCorrect).length;

        return {
            questionId: question.id,
            correctPercentage: questionAnswers.length > 0 ? (correctCount / questionAnswers.length) * 100 : 0,
            avgTime: questionAnswers.length > 0 ?
                questionAnswers.reduce((sum, a) => sum + a.timeTaken, 0) / questionAnswers.length : 0,
            difficultyScore: question.difficulty === 'easy' ? 1 :
                question.difficulty === 'medium' ? 2 :
                    question.difficulty === 'hard' ? 3 : 4,
            commonWrongAnswers: questionAnswers
                .filter(a => !a.isCorrect)
                .map(a => a.answer.toString())
                .slice(0, 3)
        };
    });

    const participantAnalytics = options.participants.map(participant => {
        const participantAnswers = options.quizSession.answers.filter(a => a.userId === participant.id);
        const correctAnswers = participantAnswers.filter(a => a.isCorrect);

        return {
            userId: participant.id,
            engagementScore: Math.min(100, (participantAnswers.length / options.quizSession.questions.length) * 100),
            improvementRate: calculateImprovementRate(participant.id, options.quizSession.answers),
            weakAreas: findWeakAreas(participant.id, options.quizSession),
            strongAreas: findStrongAreas(participant.id, options.quizSession)
        };
    });

    const overallStats = {
        averageScore: options.quizSession.answers.length > 0 ?
            (options.quizSession.answers.filter(a => a.isCorrect).length / options.quizSession.answers.length) * 100 : 0,
        completionRate: (options.quizSession.answers.length / (options.participants.length * options.quizSession.questions.length)) * 100,
        timeSpentAverage: options.quizSession.answers.length > 0 ?
            options.quizSession.answers.reduce((sum, a) => sum + a.timeTaken, 0) / options.quizSession.answers.length : 0,
        questionDifficultyDistribution: {
            easy: options.quizSession.questions.filter(q => q.difficulty === 'easy').length,
            medium: options.quizSession.questions.filter(q => q.difficulty === 'medium').length,
            hard: options.quizSession.questions.filter(q => q.difficulty === 'hard').length,
            expert: options.quizSession.questions.filter(q => q.difficulty === 'expert').length
        }
    };

    options.setQuizAnalytics({
        questionAnalytics,
        participantAnalytics,
        overallStats
    });
};

export const calculateImprovementRate = (userId: string, answers: QuizAnswer[]): number => {
    const userAnswers = answers
        .filter(a => a.userId === userId)
        .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());

    if (userAnswers.length < 2) return 0;

    const firstHalf = userAnswers.slice(0, Math.floor(userAnswers.length / 2));
    const secondHalf = userAnswers.slice(Math.floor(userAnswers.length / 2));

    const firstAccuracy = firstHalf.filter(a => a.isCorrect).length / firstHalf.length;
    const secondAccuracy = secondHalf.filter(a => a.isCorrect).length / secondHalf.length;

    if (firstAccuracy === 0) return secondAccuracy > 0 ? 100 : 0;

    return ((secondAccuracy - firstAccuracy) / firstAccuracy) * 100;
};

export const findWeakAreas = (userId: string, quizSession: QuizSession): string[] => {
    const answers = quizSession.answers.filter(a => a.userId === userId && !a.isCorrect);
    const questionIds = answers.map(a => a.questionId);
    const weakTags = new Set<string>();

    questionIds.forEach(qId => {
        const question = quizSession.questions.find(q => q.id === qId);
        if (question) {
            question.tags.forEach(tag => weakTags.add(tag));
        }
    });

    return Array.from(weakTags).slice(0, 3);
};

export const findStrongAreas = (userId: string, quizSession: QuizSession): string[] => {
    const answers = quizSession.answers.filter(a => a.userId === userId && a.isCorrect);
    const questionIds = answers.map(a => a.questionId);
    const strongTags = new Set<string>();

    questionIds.forEach(qId => {
        const question = quizSession.questions.find(q => q.id === qId);
        if (question) {
            question.tags.forEach(tag => strongTags.add(tag));
        }
    });

    return Array.from(strongTags).slice(0, 3);
};

export const generateAIQuestion = async (options: {
    aiTopic: string;
    aiDifficulty: 'easy' | 'medium' | 'hard';
    setIsGeneratingAIQuestion: (isGenerating: boolean) => void;
    setAiGeneratedQuestions: (questions: any) => void;
    setNewQuizQuestion: (question: any) => void;
}) => {
    if (!options.aiTopic.trim()) {
        toast.error('Please enter a topic');
        return;
    }

    options.setIsGeneratingAIQuestion(true);

    try {
        const token = localStorage.getItem('token');
        const apiBaseUrl = API_URL;

        const prompt = `Generate a quiz question about "${options.aiTopic}" with difficulty level "${options.aiDifficulty}". 
        The question must be high quality and specific to the topic.
        Respond ONLY with a valid JSON object (no markdown, no code blocks, just the raw JSON) in this exact format:
        {
            "question": "The question text",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "correct": 0,
            "explanation": "Why this is correct",
            "hint": "A small clue",
            "category": "The topic category"
        }`;

        const response = await fetch(`${apiBaseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message: prompt })
        });

        if (!response.ok) throw new Error('Failed to fetch AI response');

        const data = await response.json();
        const aiText = data.response;

        // Robust JSON parsing (handles cases where AI might wrap in code blocks despite instructions)
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid AI response format');

        const aiData = JSON.parse(jsonMatch[0]);

        const aiQuestion: QuizQuestion = {
            id: Date.now().toString(),
            question: aiData.question,
            type: 'multiple_choice',
            options: aiData.options,
            correctAnswer: aiData.correct,
            points: options.aiDifficulty === 'hard' ? 20 : (options.aiDifficulty === 'medium' ? 15 : 10),
            difficulty: options.aiDifficulty,
            timeLimit: options.aiDifficulty === 'hard' ? 30 : 60,
            createdAt: new Date(),
            createdBy: 'AI Assistant',
            tags: [options.aiTopic.toLowerCase(), 'ai-generated'],
            explanation: aiData.explanation,
            hint: aiData.hint,
            aiGenerated: true,
            isPublic: true,
            category: aiData.category || options.aiTopic,
            attemptsAllowed: 1
        };

        (options.setAiGeneratedQuestions as any)((prev: QuizQuestion[]) => [...prev, aiQuestion]);
        (options.setNewQuizQuestion as any)((prev: any) => ({
            ...prev,
            question: aiQuestion.question,
            options: aiQuestion.options || ['', '', '', ''],
            correctAnswer: aiQuestion.correctAnswer.toString(),
            difficulty: aiQuestion.difficulty,
            tags: aiQuestion.tags,
            explanation: aiQuestion.explanation,
            hint: aiQuestion.hint,
            category: aiQuestion.category,
            points: aiQuestion.points,
            timeLimit: aiQuestion.timeLimit,
            aiGenerated: true
        }));

        toast.success('AI question generated!');
    } catch (error) {
        console.error('Error generating AI question:', error);
        toast.error('Failed to generate AI question');
    } finally {
        options.setIsGeneratingAIQuestion(false);
    }
};