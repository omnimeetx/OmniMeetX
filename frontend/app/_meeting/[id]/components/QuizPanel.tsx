import { API_URL } from "@/lib/config"
import React, { useState, useEffect } from 'react';
import { GraduationCap, Loader2, Send, ChevronLeft, ChevronRight, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QuizQuestion {
    id: string;
    question: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correctAnswer: string | number | string[];
    points: number;
    difficulty: 'easy' | 'medium' | 'hard';
    timeLimit?: number;
    createdAt: Date;
    createdBy: string;
    tags: string[];
    explanation?: string;
    hint?: string;
    aiGenerated?: boolean;
    category?: string;
    isPublic: boolean;
    attemptsAllowed?: number;
}

interface QuizSession {
    questions: QuizQuestion[];
    answers: any[];
}

interface QuizPanelProps {
    isOwner: boolean;
    userName: string;
    quizSession: QuizSession;
    currentQuestion: QuizQuestion | null;
    currentAnswer: string;
    setCurrentAnswer: (value: string) => void;
    submitQuizAnswer: () => void;
    quizTimer: number | null;
    participants: any[];
    leaderboard?: any[];
    onOpenNewQuestionForm: () => void;
    socketRef?: React.MutableRefObject<any>;
    meetingId?: string;
    liveTranscript?: any[];
}

const QuizPanel: React.FC<QuizPanelProps> = ({
    isOwner,
    userName,
    quizSession,
    currentQuestion,
    currentAnswer,
    setCurrentAnswer,
    submitQuizAnswer,
    quizTimer,
    participants,
    leaderboard = [],
    onOpenNewQuestionForm,
    socketRef,
    meetingId,
    liveTranscript = []
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);
    const [participantTimer, setParticipantTimer] = useState<number | null>(null);

    // Handle received quiz (participant mode)
    useEffect(() => {
        if (currentQuestion && quizTimer) {
            setParticipantTimer(quizTimer);
            const interval = setInterval(() => {
                setParticipantTimer(prev => {
                    if (prev === null || prev <= 0) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [currentQuestion, quizTimer]);

    // Generate quiz from transcript
    const generateFromTranscript = async () => {
        if (liveTranscript.length < 3) return;
        setIsGenerating(true);

        try {
            const token = localStorage.getItem('token');
            const transcriptText = liveTranscript
                .map(t => `${t.speaker}: ${t.text}`)
                .join('\n');

            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    message: `Generate 5 multiple choice quiz questions from this meeting transcript. Return ONLY valid JSON array with format: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "..."}]`,
                    mode: 'default',
                    context: transcriptText
                })
            });

            const data = await res.json();
            let parsed: any[] = [];

            // Try to parse response as JSON
            try {
                const jsonMatch = data.response?.match(/\[[\s\S]*\]/);
                if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            } catch { /* ignore parse errors */ }

            if (parsed.length > 0) {
                const questions: QuizQuestion[] = parsed.map((q: any, i: number) => ({
                    id: `gen-${Date.now()}-${i}`,
                    question: q.question,
                    type: 'multiple_choice' as const,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    points: 10,
                    difficulty: 'medium' as const,
                    timeLimit: 30,
                    createdAt: new Date(),
                    createdBy: userName,
                    tags: ['ai-generated'],
                    explanation: q.explanation,
                    aiGenerated: true,
                    isPublic: true,
                    category: 'Meeting Content'
                }));
                setGeneratedQuestions(questions);
                setCurrentQuestionIndex(0);
            }
        } catch (err) {
            console.error('Failed to generate quiz:', err);
        }

        setIsGenerating(false);
    };

    // Broadcast quiz to all participants
    const sendToAll = () => {
        if (!socketRef?.current || !meetingId || generatedQuestions.length === 0) return;
        socketRef.current.emit('quiz-start', {
            meetingId,
            questions: generatedQuestions,
            timePerQuestion: 30
        });
    };

    const displayQuestions = generatedQuestions.length > 0 ? generatedQuestions : quizSession.questions;
    const activeQ = displayQuestions[currentQuestionIndex];

    // ─── HOST VIEW ─────────────────────────────────────────
    if (isOwner) {
        return (
            <div className="flex flex-col h-full gap-4">
                <div className="flex items-center gap-2">
                    <GraduationCap className="text-primary" size={20} />
                    <h3 className="font-semibold">Quiz Generator</h3>
                </div>

                {/* Generate button */}
                <Button
                    onClick={generateFromTranscript}
                    disabled={isGenerating || liveTranscript.length < 3}
                    className="w-full gap-2"
                    variant="default"
                >
                    {isGenerating ? (
                        <><Loader2 size={16} className="animate-spin" /> Generating...</>
                    ) : (
                        <><Sparkles size={16} /> Generate from Transcript</>
                    )}
                </Button>

                {liveTranscript.length < 3 && (
                    <p className="text-xs text-white/40 text-center">Need more meeting content to generate questions</p>
                )}

                {/* Quiz card */}
                {activeQ ? (
                    <div className="flex-1 flex flex-col gap-3 bg-white/5 rounded-xl p-4 border border-line">
                        {/* Question header */}
                        <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                                Q{currentQuestionIndex + 1} / {displayQuestions.length}
                            </Badge>
                            {activeQ.aiGenerated && (
                                <Badge variant="default" className="text-xs gap-1">
                                    <Sparkles size={10} /> AI Generated
                                </Badge>
                            )}
                        </div>

                        {/* Question text */}
                        <p className="text-sm font-medium leading-relaxed">{activeQ.question}</p>

                        {/* Options */}
                        {activeQ.options && (
                            <div className="space-y-2">
                                {activeQ.options.map((opt, i) => {
                                    const isCorrect = activeQ.correctAnswer === i || activeQ.correctAnswer === opt;
                                    return (
                                        <div
                                            key={i}
                                            className={`p-2.5 rounded-lg text-sm border transition-colors ${isCorrect
                                                ? 'border-green-500/30 bg-green-500/10 text-green-300'
                                                : 'border-line bg-white/5 text-white/70'
                                                }`}
                                        >
                                            <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                                            {opt}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Explanation */}
                        {activeQ.explanation && (
                            <p className="text-xs text-white/50 italic mt-1">💡 {activeQ.explanation}</p>
                        )}

                        {/* Navigation */}
                        <div className="flex items-center justify-between mt-auto pt-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="gap-1"
                            >
                                <ChevronLeft size={14} /> Prev
                            </Button>
                            <span className="text-xs text-white/40">{currentQuestionIndex + 1} / {displayQuestions.length}</span>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setCurrentQuestionIndex(Math.min(displayQuestions.length - 1, currentQuestionIndex + 1))}
                                disabled={currentQuestionIndex >= displayQuestions.length - 1}
                                className="gap-1"
                            >
                                Next <ChevronRight size={14} />
                            </Button>
                        </div>

                        {/* Broadcast button */}
                        <Button
                            onClick={sendToAll}
                            className="w-full gap-2 mt-2"
                            variant="default"
                        >
                            <Send size={16} /> Send to All Participants
                        </Button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/30 gap-2">
                        <GraduationCap size={40} strokeWidth={1} />
                        <p className="text-sm">No questions generated yet</p>
                        <p className="text-xs text-white/20">Generate from transcript or add manually</p>
                    </div>
                )}

                {/* Manual add button */}
                <Button
                    onClick={onOpenNewQuestionForm}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                >
                    + Add Question Manually
                </Button>
            </div>
        );
    }

    // ─── PARTICIPANT VIEW ──────────────────────────────────
    const participantQ = currentQuestion || activeQ;
    const isSubmitted = submittedAnswer !== null;
    
    // Determine correctness if submitted
    let isCorrect = false;
    if (isSubmitted && participantQ) {
        // Find option index
        const optIndex = participantQ.options?.findIndex(o => o === submittedAnswer) ?? -1;
        isCorrect = participantQ.correctAnswer === optIndex || participantQ.correctAnswer === submittedAnswer;
    }

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex items-center gap-2">
                <GraduationCap className="text-primary" size={20} />
                <h3 className="font-semibold">Quiz</h3>
            </div>

            {participantQ ? (
                <div className="flex-1 flex flex-col gap-3 bg-white/5 rounded-xl p-4 border border-line overflow-y-auto">
                    {/* Timer */}
                    {participantTimer !== null && participantTimer > 0 && !isSubmitted && (
                        <div className="flex items-center gap-2">
                            <Clock size={14} className={participantTimer <= 10 ? 'text-red-400' : 'text-primary'} />
                            <span className={`text-sm font-mono font-bold ${participantTimer <= 10 ? 'text-red-400 animate-pulse' : 'text-primary'}`}>
                                {participantTimer}s remaining
                            </span>
                        </div>
                    )}

                    {/* Question text */}
                    <p className="text-sm font-medium leading-relaxed">{participantQ.question}</p>

                    {/* Options (radio-style) */}
                    {participantQ.options && (
                        <div className="space-y-2">
                            {participantQ.options.map((opt, i) => {
                                const optValue = String(i);
                                const isSelected = currentAnswer === optValue || currentAnswer === opt;
                                
                                // Result styling after submission
                                let resultClass = 'border-line bg-white/5 text-white/70 hover:bg-white/8 hover:border-white/20';
                                if (isSubmitted) {
                                    const isActuallyCorrect = participantQ.correctAnswer === i || participantQ.correctAnswer === opt;
                                    if (isActuallyCorrect) {
                                        resultClass = 'border-green-500 bg-green-500/15 text-white ring-1 ring-green-500';
                                    } else if (isSelected && !isActuallyCorrect) {
                                        resultClass = 'border-red-500 bg-red-500/15 text-white ring-1 ring-red-500';
                                    } else {
                                        resultClass = 'border-line bg-white/5 opacity-50';
                                    }
                                } else if (isSelected) {
                                    resultClass = 'border-primary bg-primary/15 text-white';
                                }

                                return (
                                    <button
                                        key={i}
                                        onClick={() => { if (!isSubmitted) setCurrentAnswer(optValue); }}
                                        disabled={isSubmitted}
                                        className={`w-full text-left p-3 rounded-lg text-sm border transition-all ${resultClass} ${isSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {!isSubmitted && (
                                                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-primary' : 'border-white/30'}`}>
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                                                </div>
                                            )}
                                            <span className="flex-1">
                                                <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                                                {opt}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Submit button */}
                    {!isSubmitted && (
                        <Button
                            onClick={() => {
                                submitQuizAnswer();
                                setSubmittedAnswer(currentAnswer);
                                
                                // Auto broadcast quiz complete if all questions done (handled by parent typically, but we can emit here if needed)
                                if (socketRef?.current && meetingId) {
                                    socketRef.current.emit('quiz-complete', { meetingId, userId: userName });
                                }
                            }}
                            disabled={!currentAnswer}
                            className="w-full mt-2"
                            variant="default"
                        >
                            Submit Answer
                        </Button>
                    )}
                    
                    {/* Result feedback */}
                    {isSubmitted && (
                        <div className={`mt-2 p-3 rounded-lg border flex flex-col gap-2 ${isCorrect ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                            <div className="flex items-center gap-2 font-medium">
                                {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                            </div>
                            {participantQ.explanation && (
                                <p className="text-xs text-white/70 italic leading-relaxed">
                                    💡 {participantQ.explanation}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Leaderboard preview (if answers exist in session) */}
                    {isSubmitted && quizSession?.answers?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-line">
                            <h4 className="text-xs font-semibold uppercase text-white/40 mb-3">Live Leaderboard</h4>
                            <div className="space-y-2">
                                {/* Calculate actual scores from participants array which is updated via socket broadcast */}
                                {participants
                                    .filter(p => p.quizScore > 0 || p.totalAttempts > 0)
                                    .sort((a, b) => (b.quizScore || 0) - (a.quizScore || 0))
                                    .slice(0, 5)
                                    .map((p, idx) => (
                                        <div key={p.id} className="flex items-center justify-between bg-white/5 rounded px-3 py-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/30 font-mono text-xs w-4">{idx + 1}.</span>
                                                <span className="font-medium">{p.name} {p.name === userName ? '(You)' : ''}</span>
                                            </div>
                                            <Badge variant="outline" className={p.quizScore > 0 ? 'text-green-300 border-green-500/30' : ''}>
                                                {p.quizScore || 0} pts
                                            </Badge>
                                        </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white/30 gap-2">
                    <GraduationCap size={40} strokeWidth={1} />
                    <p className="text-sm">Waiting for quiz...</p>
                    <p className="text-xs text-white/20">The host will start a quiz shortly</p>
                </div>
            )}
        </div>
    );
};

export default QuizPanel;