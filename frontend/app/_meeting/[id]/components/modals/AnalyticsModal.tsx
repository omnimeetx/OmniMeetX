import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { QuizAnalytics, QuizSession, Participant } from '../types';
import { BarChart, PieChart, TrendingUp, Users, Clock, Award } from 'lucide-react';

interface AnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    quizAnalytics: QuizAnalytics | null;
    quizSession: QuizSession;
    participants: Participant[];
}

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
    isOpen,
    onClose,
    quizAnalytics,
    quizSession,
    participants
}) => {
    if (!quizAnalytics) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-canvas border-line text-white max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart size={20} />
                        Quiz Analytics
                    </DialogTitle>
                    <DialogDescription className="text-white/60">
                        Detailed insights and statistics
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                    {/* Overall Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        <Card className="bg-white/5 border-line">
                            <CardContent className="p-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                                    <Award className="text-primary" size={24} />
                                </div>
                                <p className="text-2xl font-bold">{quizAnalytics.overallStats.averageScore.toFixed(1)}%</p>
                                <p className="text-xs text-white/60">Average Score</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/5 border-line">
                            <CardContent className="p-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                                    <Users className="text-green-400" size={24} />
                                </div>
                                <p className="text-2xl font-bold">{quizAnalytics.overallStats.completionRate.toFixed(1)}%</p>
                                <p className="text-xs text-white/60">Completion Rate</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/5 border-line">
                            <CardContent className="p-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                                    <Clock className="text-blue-400" size={24} />
                                </div>
                                <p className="text-2xl font-bold">{quizAnalytics.overallStats.timeSpentAverage.toFixed(1)}s</p>
                                <p className="text-xs text-white/60">Avg Time/Question</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/5 border-line">
                            <CardContent className="p-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                                    <TrendingUp className="text-purple-400" size={24} />
                                </div>
                                <p className="text-2xl font-bold">{quizSession.questions.length}</p>
                                <p className="text-xs text-white/60">Total Questions</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Question Analytics */}
                    <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                            <BarChart size={18} />
                            Question Performance
                        </h4>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {quizAnalytics.questionAnalytics.map((item, index) => {
                                const question = quizSession.questions.find(q => q.id === item.questionId);
                                return (
                                    <Card key={index} className="bg-white/5 border-line hover:bg-white/10 transition-colors">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-sm font-medium flex-1 pr-2">
                                                    {index + 1}. {question?.question}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        {item.difficultyScore}/4
                                                    </Badge>
                                                    <Badge className={`text-xs ${
                                                        item.correctPercentage >= 70 ? 'bg-green-500/20 text-green-400' :
                                                        item.correctPercentage >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {item.correctPercentage.toFixed(1)}%
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-white/60">Correct Rate</span>
                                                    <span>{item.correctPercentage.toFixed(1)}%</span>
                                                </div>
                                                <Progress 
                                                    value={item.correctPercentage} 
                                                    className="h-1"
                                                    indicatorClassName={`${
                                                        item.correctPercentage >= 70 ? 'bg-green-500' :
                                                        item.correctPercentage >= 40 ? 'bg-yellow-500' :
                                                        'bg-red-500'
                                                    }`}
                                                />
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-white/60">Avg Time</span>
                                                    <span>{item.avgTime.toFixed(1)}s</span>
                                                </div>
                                                {item.commonWrongAnswers.length > 0 && (
                                                    <div className="text-xs text-white/60 mt-1">
                                                        <span className="font-medium">Common mistakes:</span> {item.commonWrongAnswers.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* Participant Analytics */}
                    <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Users size={18} />
                            Participant Performance
                        </h4>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {quizAnalytics.participantAnalytics.map((item, index) => {
                                const participant = participants.find(p => p.id === item.userId);
                                const participantAnswers = quizSession.answers.filter(a => a.userId === item.userId);
                                const correctAnswers = participantAnswers.filter(a => a.isCorrect);
                                
                                return (
                                    <Card key={index} className="bg-white/5 border-line hover:bg-white/10 transition-colors">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                                                        {participant?.name.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{participant?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-white/60">
                                                            {correctAnswers.length}/{participantAnswers.length} correct
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <Badge variant="outline" className="text-xs">
                                                        {item.improvementRate > 0 ? '📈' : '📉'} {Math.abs(item.improvementRate).toFixed(1)}%
                                                    </Badge>
                                                    <div className="text-xs">
                                                        <span className="text-white/60">Engagement: </span>
                                                        <span className="font-medium">{item.engagementScore.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-xs mt-3">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-white/60 mb-1">Strong Areas:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.strongAreas.map((area, idx) => (
                                                                <span key={idx} className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">
                                                                    {area}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-white/60 mb-1">Weak Areas:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.weakAreas.map((area, idx) => (
                                                                <span key={idx} className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">
                                                                    {area}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-line">
                                                    <div className="flex justify-between">
                                                        <span>Total Questions Attempted:</span>
                                                        <span>{participantAnswers.length}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Accuracy:</span>
                                                        <span>{participantAnswers.length > 0 ? 
                                                            ((correctAnswers.length / participantAnswers.length) * 100).toFixed(1) : 0}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* Difficulty Distribution */}
                    <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                            <PieChart size={18} />
                            Difficulty Distribution
                        </h4>
                        <div className="grid grid-cols-4 gap-4">
                            {Object.entries(quizAnalytics.overallStats.questionDifficultyDistribution).map(([difficulty, count]) => (
                                <Card key={difficulty} className="bg-white/5 border-line">
                                    <CardContent className="p-4 text-center">
                                        <p className="text-2xl font-bold">{count}</p>
                                        <p className="text-xs text-white/60 capitalize">{difficulty}</p>
                                        <Progress 
                                            value={(count / quizSession.questions.length) * 100} 
                                            className="h-1 mt-2"
                                            indicatorClassName={
                                                difficulty === 'easy' ? 'bg-green-500' :
                                                difficulty === 'medium' ? 'bg-yellow-500' :
                                                difficulty === 'hard' ? 'bg-orange-500' :
                                                'bg-red-500'
                                            }
                                        />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AnalyticsModal;