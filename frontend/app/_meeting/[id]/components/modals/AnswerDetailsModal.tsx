import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QuizAnswer, QuizSession, Participant } from '../types';

interface AnswerDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedAnswer: QuizAnswer | null;
    quizSession: QuizSession;
    participants: Participant[];
    setSelectedUserForPrivateQuestion: (userId: string | null) => void;
    setShowNewQuestionForm: (show: boolean) => void;
    setShowAnswerPopup: (show: boolean) => void;
}

const AnswerDetailsModal: React.FC<AnswerDetailsModalProps> = ({
    isOpen,
    onClose,
    selectedAnswer,
    quizSession,
    participants,
    setSelectedUserForPrivateQuestion,
    setShowNewQuestionForm,
    setShowAnswerPopup
}) => {
    if (!selectedAnswer) return null;

    const question = quizSession.questions.find(q => q.id === selectedAnswer.questionId);
    const participant = participants.find(p => p.id === selectedAnswer.userId);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-canvas border-line text-white">
                <DialogHeader>
                    <DialogTitle>Answer Details</DialogTitle>
                    <DialogDescription className="text-white/60">
                        Review student's answer
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            {participant?.name.charAt(0) || 'U'}
                        </div>
                        <div>
                            <p className="font-medium">
                                {participant?.name || selectedAnswer.userName}
                            </p>
                            <p className="text-xs text-white/60">
                                Submitted {new Date(selectedAnswer.submittedAt).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <p className="font-medium">Question:</p>
                        <p className="text-sm p-2 bg-white/5 rounded">
                            {question?.question}
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <p className="font-medium">Student's Answer:</p>
                        <p className={`text-sm p-2 rounded ${selectedAnswer.isCorrect
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                            }`}>
                            {selectedAnswer.answer.toString()}
                        </p>
                    </div>
                    
                    {selectedAnswer.aiFeedback && (
                        <div className="space-y-2">
                            <p className="font-medium">AI Feedback:</p>
                            <p className="text-sm text-blue-400 p-2 bg-blue-500/10 rounded">
                                {selectedAnswer.aiFeedback}
                            </p>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                        <div>
                            <span className="text-white/60">Time Taken: </span>
                            <span className="font-medium">{selectedAnswer.timeTaken}s</span>
                        </div>
                        <div>
                            <span className="text-white/60">Confidence: </span>
                            <span className="font-medium">{selectedAnswer.confidence}%</span>
                        </div>
                    </div>
                    
                    {!selectedAnswer.isCorrect && question?.attemptsAllowed && selectedAnswer.attemptNumber < question.attemptsAllowed && (
                        <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                            <p className="text-sm text-yellow-400">
                                ❗ Student has {question.attemptsAllowed - selectedAnswer.attemptNumber} more attempts
                            </p>
                        </div>
                    )}
                </div>
                
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                    {!selectedAnswer.isCorrect && (
                        <Button
                            onClick={() => {
                                setSelectedUserForPrivateQuestion(selectedAnswer.userId);
                                setShowNewQuestionForm(true);
                                setShowAnswerPopup(false);
                                onClose();
                            }}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            Send Private Question
                        </Button>
                    )}
                    {question && (
                        <Button
                            onClick={() => {
                                // Navigate to question or highlight it
                                console.log('View question:', question.id);
                            }}
                            variant="secondary"
                        >
                            View Question
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AnswerDetailsModal;