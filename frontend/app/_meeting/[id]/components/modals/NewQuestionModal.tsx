import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { 
    Plus, 
    Brain, 
    Loader2, 
    Send, 
    Infinity as InfinityIcon, 
    Sparkles, 
    Palette,
    Clock,
    Trophy,
    Hash,
    Tag,
    HelpCircle,
    BookOpen,
    Users,
    Zap,
    ChevronDown,
    ChevronUp,
    Star,
    Award,
    Target,
    Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuizQuestion } from '../types';

// Color themes for different sections
const colorThemes = {
    primary: {
        bg: 'bg-white/[0.04]',
        border: 'border-purple-500/30',
        text: 'text-purple-300',
        icon: 'text-purple-400',
        button: 'tile-accent hover:from-purple-700 hover:to-blue-700',
        gradient: 'from-purple-500/20 to-blue-500/20'
    },
    ai: {
        bg: 'bg-white/[0.04]',
        border: 'border-emerald-500/30',
        text: 'text-emerald-300',
        icon: 'text-emerald-400',
        button: 'tile-accent hover:from-emerald-700 hover:to-teal-700',
        gradient: 'from-emerald-500/20 to-teal-500/20'
    },
    difficulty: {
        easy: 'bg-white/[0.04] border-green-500/40 text-green-300',
        medium: 'bg-white/[0.04] border-yellow-500/40 text-yellow-300',
        hard: 'bg-red-500/10 border-red-500/40 text-rose-300',
        expert: 'bg-white/[0.04] border-purple-500/40 text-purple-300'
    },
    type: {
        multiple_choice: 'bg-white/[0.04] border-blue-500/40',
        true_false: 'bg-white/[0.04] border-green-500/40',
        short_answer: 'bg-white/[0.04] border-orange-500/40',
        code: 'bg-white/[0.04] border-purple-500/40',
        image: 'bg-white/[0.04] border-pink-500/40',
        audio: 'bg-white/[0.04] border-indigo-500/40'
    }
};

interface NewQuestionModalProps {
    isOpen: boolean;
    onClose: () => void;
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
    setNewQuizQuestion: (question: any) => void;
    sendQuizQuestion: () => void;
    aiTopic: string;
    setAiTopic: (topic: string) => void;
    aiDifficulty: 'easy' | 'medium' | 'hard';
    setAiDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
    isGeneratingAIQuestion: boolean;
    generateAIQuestion: () => void;
    aiGeneratedQuestions: QuizQuestion[];
    setShowNewQuestionForm: (show: boolean) => void;
}

const NewQuestionModal: React.FC<NewQuestionModalProps> = ({
    isOpen,
    onClose,
    newQuizQuestion,
    setNewQuizQuestion,
    sendQuizQuestion,
    aiTopic,
    setAiTopic,
    aiDifficulty,
    setAiDifficulty,
    isGeneratingAIQuestion,
    generateAIQuestion,
    aiGeneratedQuestions,
    setShowNewQuestionForm
}) => {
    const [activeColorTheme, setActiveColorTheme] = React.useState<'purple' | 'blue' | 'green' | 'pink'>('purple');
    const [expandedSections, setExpandedSections] = React.useState({
        ai: true,
        basic: true,
        options: true,
        advanced: false,
        settings: false
    });

    const themes = {
        purple: {
            primary: 'from-purple-600 to-pink-600',
            light: 'bg-purple-500/20',
            border: 'border-purple-500/30',
            text: 'text-purple-300'
        },
        blue: {
            primary: 'from-blue-600 to-cyan-600',
            light: 'bg-blue-500/20',
            border: 'border-blue-500/30',
            text: 'text-blue-300'
        },
        green: {
            primary: 'from-emerald-600 to-teal-600',
            light: 'bg-emerald-500/20',
            border: 'border-emerald-500/30',
            text: 'text-emerald-300'
        },
        pink: {
            primary: 'from-pink-600 to-rose-600',
            light: 'bg-pink-500/20',
            border: 'border-pink-500/30',
            text: 'text-pink-300'
        }
    };

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-gradient-to-br from-gray-900 via-gray-950 to-black border border-line text-white max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50">
                <DialogHeader>
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${themes[activeColorTheme].primary}`}>
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold text-white text-justify">
                                    Create New Quiz Question
                                </DialogTitle>
                                <DialogDescription className="text-white/70 flex items-center gap-2 text-justify">
                                    <Zap className="w-4 h-4" />
                                    Send a question to all participants or selected users
                                </DialogDescription>
                            </div>
                        </div>
                        
                        {/* Color Theme Selector */}
                        <div className="flex items-center gap-2">
                            <Palette className="w-4 h-4 text-white/60" />
                            <div className="flex gap-1">
                                {(['purple', 'blue', 'green', 'pink'] as const).map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setActiveColorTheme(color)}
                                        className={`w-6 h-6 rounded-full border-2 ${color === activeColorTheme ? 'border-white scale-110' : 'border-white/20'} transition-all duration-300`}
                                        style={{
                                            background: color === 'purple' ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' :
                                                       color === 'blue' ? 'linear-gradient(135deg, #3b82f6, #06b6d4)' :
                                                       color === 'green' ? 'linear-gradient(135deg, #10b981, #14b8a6)' :
                                                       'linear-gradient(135deg, var(--sand), #f43f5e)'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </DialogHeader>

                <div className="space-y-4">
                    {/* AI Question Generator Section */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className={`rounded-2xl ${colorThemes.ai.bg} border ${colorThemes.ai.border} overflow-hidden`}
                    >
                        <button
                            onClick={() => toggleSection('ai')}
                            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all duration-300"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg tile-accent">
                                    <Brain className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-lg flex items-center gap-2 text-justify">
                                        <span className={colorThemes.ai.text}>AI Question Generator</span>
                                        <Sparkles className="w-4 h-4 text-emerald-400" />
                                    </h4>
                                    <p className="text-sm text-white/60 text-justify">Generate questions with AI intelligence</p>
                                </div>
                            </div>
                            {expandedSections.ai ? (
                                <ChevronUp className="w-5 h-5 text-white/60" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-white/60" />
                            )}
                        </button>

                        <AnimatePresence>
                            {expandedSections.ai && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-4 pb-4"
                                >
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <div className="flex-1 relative">
                                                <Input
                                                    value={aiTopic}
                                                    onChange={(e) => setAiTopic(e.target.value)}
                                                    placeholder="Enter topic for AI questions..."
                                                    className="pl-10 bg-black/50 border-emerald-500/30 focus:border-emerald-500"
                                                />
                                                <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-emerald-400" />
                                            </div>
                                            <Select value={aiDifficulty} onValueChange={(value: any) => setAiDifficulty(value)}>
                                                <SelectTrigger className={`w-32 bg-black/50 border-emerald-500/30 ${colorThemes.difficulty[aiDifficulty]}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-900 border-emerald-500/30 text-white">
                                                    <SelectItem value="easy" className="text-green-400 focus:text-green-300 text-justify">Easy</SelectItem>
                                                    <SelectItem value="medium" className="text-yellow-400 focus:text-yellow-300 text-justify">Medium</SelectItem>
                                                    <SelectItem value="hard" className="text-red-400 focus:text-red-300 text-justify">Hard</SelectItem>
                                                    <SelectItem value="expert" className="text-purple-400 hover:text-purple-300 text-justify">Expert</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                onClick={generateAIQuestion}
                                                disabled={isGeneratingAIQuestion}
                                                className={colorThemes.ai.button}
                                            >
                                                {isGeneratingAIQuestion ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Brain className="mr-2 h-4 w-4" />
                                                        AI Generate
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        {aiGeneratedQuestions.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="space-y-2"
                                            >
                                                <h5 className="text-sm font-medium flex items-center gap-2 text-emerald-300 text-justify">
                                                    <Sparkles className="w-4 h-4" />
                                                    AI Generated Questions
                                                </h5>
                                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                                    {aiGeneratedQuestions.slice(-3).reverse().map((question, index) => (
                                                        <motion.div
                                                            key={index}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.1 }}
                                                            className="p-3 bg-white/[0.04] border border-emerald-500/20 rounded-lg hover:border-emerald-500/40 transition-all duration-300"
                                                        >
                                                            <p className="font-medium text-sm text-justify">{question.question}</p>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-xs px-2 py-1 rounded-full bg-emerald-900/50 text-emerald-300 text-justify">
                                                                    {question.difficulty}
                                                                </span>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-xs border-emerald-500/30 hover:bg-emerald-500/20 text-justify"
                                                                    onClick={() => {
                                                                        setNewQuizQuestion(prev => ({
                                                                            ...prev,
                                                                            question: question.question,
                                                                            type: question.type,
                                                                            options: question.options || ['', '', '', ''],
                                                                            correctAnswer: question.correctAnswer.toString(),
                                                                            points: question.points,
                                                                            difficulty: question.difficulty,
                                                                            timeLimit: question.timeLimit || 60,
                                                                            tags: question.tags,
                                                                            explanation: question.explanation || '',
                                                                            hint: question.hint || '',
                                                                            isPublic: true,
                                                                            targetUserIds: [],
                                                                            attemptsAllowed: question.attemptsAllowed || 1,
                                                                            category: question.category || 'General',
                                                                            aiGenerated: true
                                                                        }));
                                                                    }}
                                                                >
                                                                    Use This
                                                                </Button>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Basic Information Section */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className={`rounded-2xl ${colorThemes.primary.bg} border ${colorThemes.primary.border} overflow-hidden`}
                    >
                        <button
                            onClick={() => toggleSection('basic')}
                            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all duration-300"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg tile-accent">
                                    <Hash className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-lg flex items-center gap-2 text-purple-300 text-justify">
                                        Question Details
                                        <Star className="w-4 h-4 text-yellow-400" />
                                    </h4>
                                    <p className="text-sm text-white/60 text-justify">Set up your question basics</p>
                                </div>
                            </div>
                            {expandedSections.basic ? (
                                <ChevronUp className="w-5 h-5 text-white/60" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-white/60" />
                            )}
                        </button>

                        <AnimatePresence>
                            {expandedSections.basic && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-4 pb-4 space-y-4"
                                >
                                    {/* Question Type and Difficulty */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2 text-justify">
                                                <BookOpen className="w-4 h-4" />
                                                Question Type
                                            </Label>
                                            <Select
                                                value={newQuizQuestion.type}
                                                onValueChange={(value: any) => setNewQuizQuestion(prev => ({ ...prev, type: value }))}
                                            >
                                                <SelectTrigger className={`bg-black/50 border ${colorThemes.type[newQuizQuestion.type as keyof typeof colorThemes.type]} transition-all duration-300`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-900 border-line text-white">
                                                    {Object.keys(colorThemes.type).map((type) => (
                                                        <SelectItem 
                                                            key={type} 
                                                            value={type}
                                                            className={`hover:bg-gradient-to-r ${colorThemes.type[type as keyof typeof colorThemes.type]} transition-all duration-300 text-justify`}
                                                        >
                                                            {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2 text-justify">
                                                <Award className="w-4 h-4" />
                                                Difficulty
                                            </Label>
                                            <Select
                                                value={newQuizQuestion.difficulty}
                                                onValueChange={(value: any) => setNewQuizQuestion(prev => ({ ...prev, difficulty: value }))}
                                            >
                                                <SelectTrigger className={`bg-black/50 border ${colorThemes.difficulty[newQuizQuestion.difficulty as keyof typeof colorThemes.difficulty]} transition-all duration-300`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-900 border-line text-white">
                                                    <SelectItem value="easy" className="text-green-400 hover:text-green-300 text-justify">Easy 🌿</SelectItem>
                                                    <SelectItem value="medium" className="text-yellow-400 hover:text-yellow-300 text-justify">Medium ⚡</SelectItem>
                                                    <SelectItem value="hard" className="text-red-400 hover:text-red-300 text-justify">Hard 🔥</SelectItem>
                                                    <SelectItem value="expert" className="text-purple-400 hover:text-purple-300 text-justify">Expert 💎</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Question Text */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-justify">
                                            <HelpCircle className="w-4 h-4" />
                                            Question
                                        </Label>
                                        <Textarea
                                            value={newQuizQuestion.question}
                                            onChange={(e) => setNewQuizQuestion(prev => ({ ...prev, question: e.target.value }))}
                                            placeholder="Enter your question..."
                                            className="bg-black/50 border-purple-500/30 focus:border-purple-500 min-h-[100px] transition-all duration-300 text-justify"
                                        />
                                    </div>

                                    {/* Category */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-justify">
                                            <Tag className="w-4 h-4" />
                                            Category
                                        </Label>
                                        <Input
                                            value={newQuizQuestion.category}
                                            onChange={(e) => setNewQuizQuestion(prev => ({ ...prev, category: e.target.value }))}
                                            placeholder="General, Math, Science, etc."
                                            className="bg-black/50 border-purple-500/30 focus:border-purple-500 text-justify"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Options Section */}
                    {(newQuizQuestion.type === 'multiple_choice' || newQuizQuestion.type === 'true_false') && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className={`rounded-2xl ${colorThemes.primary.bg} border ${colorThemes.primary.border} overflow-hidden`}
                        >
                            <button
                                onClick={() => toggleSection('options')}
                                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all duration-300"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg tile-accent">
                                        <Target className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-bold text-lg flex items-center gap-2 text-blue-300 text-justify">
                                            Answer Options
                                            {newQuizQuestion.type === 'multiple_choice' && ' (Multiple Choice)'}
                                            {newQuizQuestion.type === 'true_false' && ' (True/False)'}
                                        </h4>
                                        <p className="text-sm text-white/60 text-justify">Set correct answers and options</p>
                                    </div>
                                </div>
                                {expandedSections.options ? (
                                    <ChevronUp className="w-5 h-5 text-white/60" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-white/60" />
                                )}
                            </button>

                            <AnimatePresence>
                                {expandedSections.options && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="px-4 pb-4"
                                    >
                                        {newQuizQuestion.type === 'multiple_choice' && (
                                            <div className="space-y-3">
                                                <Label className="text-white/80 text-justify">Options (Click star to mark correct)</Label>
                                                {newQuizQuestion.options.map((option, index) => (
                                                    <motion.div
                                                        key={index}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.1 }}
                                                        className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-300 ${newQuizQuestion.correctAnswer === index.toString() 
                                                            ? 'bg-white/[0.04] border border-green-500/40' 
                                                            : 'bg-black/30 border border-line hover:border-white/20'}`}
                                                    >
                                                        <div className="flex items-center justify-center w-8 h-8 rounded-full tile-accent text-sm font-bold">
                                                            {String.fromCharCode(65 + index)}
                                                        </div>
                                                        <Input
                                                            value={option}
                                                            onChange={(e) => {
                                                                const newOptions = [...newQuizQuestion.options];
                                                                newOptions[index] = e.target.value;
                                                                setNewQuizQuestion(prev => ({ ...prev, options: newOptions }));
                                                            }}
                                                            placeholder={`Option ${index + 1}`}
                                                            className="flex-1 bg-transparent border-none focus:ring-0 text-justify"
                                                        />
                                                        <button
                                                            onClick={() => setNewQuizQuestion(prev => ({ ...prev, correctAnswer: index.toString() }))}
                                                            className={`p-2 rounded-full transition-all duration-300 ${newQuizQuestion.correctAnswer === index.toString() 
                                                                ? 'text-yellow-400 bg-yellow-400/20' 
                                                                : 'text-white/40 hover:text-yellow-300 hover:bg-yellow-400/10'}`}
                                                        >
                                                            <Star className={`w-5 h-5 ${newQuizQuestion.correctAnswer === index.toString() ? 'fill-yellow-400' : ''}`} />
                                                        </button>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}

                                        {newQuizQuestion.type === 'true_false' && (
                                            <div className="space-y-3">
                                                <Label className="text-white/80 text-justify">Select Correct Answer</Label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {['true', 'false'].map((value, index) => (
                                                        <motion.button
                                                            key={value}
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: index * 0.1 }}
                                                            onClick={() => setNewQuizQuestion(prev => ({ ...prev, correctAnswer: value }))}
                                                            className={`p-4 rounded-xl transition-all duration-300 flex flex-col items-center gap-2 ${newQuizQuestion.correctAnswer === value 
                                                                ? 'bg-white/[0.04] border-2 border-green-400' 
                                                                : 'bg-black/30 border border-line hover:border-white/20'}`}
                                                        >
                                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${value === 'true' 
                                                                ? 'tile-accent' 
                                                                : 'bg-red-500'}`}>
                                                                {value === 'true' ? '✓' : '✗'}
                                                            </div>
                                                            <span className="font-bold capitalize text-justify">{value}</span>
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {/* Advanced Settings Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className={`rounded-2xl ${colorThemes.primary.bg} border ${colorThemes.primary.border} overflow-hidden`}
                    >
                        <button
                            onClick={() => toggleSection('advanced')}
                            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all duration-300"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg tile-accent">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-lg flex items-center gap-2 text-pink-300 text-justify">
                                        Advanced Settings
                                        <Sparkles className="w-4 h-4" />
                                    </h4>
                                    <p className="text-sm text-white/60 text-justify">Timer, points, hints & explanations</p>
                                </div>
                            </div>
                            {expandedSections.advanced ? (
                                <ChevronUp className="w-5 h-5 text-white/60" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-white/60" />
                            )}
                        </button>

                        <AnimatePresence>
                            {expandedSections.advanced && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-4 pb-4 space-y-4"
                                >
                                    {/* Points and Time Limit */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2 text-justify">
                                                <Trophy className="w-4 h-4" />
                                                Points
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={newQuizQuestion.points}
                                                    onChange={(e) => setNewQuizQuestion(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                                                    className="pl-10 bg-black/50 border-violet-500/30 focus:border-violet-500"
                                                />
                                                <Trophy className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-yellow-400" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2 text-justify">
                                                <Timer className="w-4 h-4" />
                                                Time Limit (seconds)
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={newQuizQuestion.timeLimit}
                                                    onChange={(e) => setNewQuizQuestion(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
                                                    className="pl-10 bg-black/50 border-violet-500/30 focus:border-violet-500"
                                                />
                                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hint */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-justify">
                                            <HelpCircle className="w-4 h-4" />
                                            Hint (Optional)
                                        </Label>
                                        <Input
                                            value={newQuizQuestion.hint}
                                            onChange={(e) => setNewQuizQuestion(prev => ({ ...prev, hint: e.target.value }))}
                                            placeholder="Provide a hint for students..."
                                            className="bg-black/50 border-violet-500/30 focus:border-violet-500 text-justify"
                                        />
                                    </div>

                                    {/* Explanation */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-justify">
                                            <BookOpen className="w-4 h-4" />
                                            Explanation (Optional)
                                        </Label>
                                        <Textarea
                                            value={newQuizQuestion.explanation}
                                            onChange={(e) => setNewQuizQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                                            placeholder="Explain the correct answer..."
                                            className="bg-black/50 border-violet-500/30 focus:border-violet-500 min-h-[80px] text-justify"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Settings Section */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className={`rounded-2xl ${colorThemes.primary.bg} border ${colorThemes.primary.border} overflow-hidden`}
                    >
                        <button
                            onClick={() => toggleSection('settings')}
                            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all duration-300"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500">
                                    <Settings className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-lg flex items-center gap-2 text-amber-300 text-justify">
                                        Quiz Settings
                                        <Award className="w-4 h-4" />
                                    </h4>
                                    <p className="text-sm text-white/60 text-justify">Visibility and attempts configuration</p>
                                </div>
                            </div>
                            {expandedSections.settings ? (
                                <ChevronUp className="w-5 h-5 text-white/60" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-white/60" />
                            )}
                        </button>

                        <AnimatePresence>
                            {expandedSections.settings && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-4 pb-4 space-y-4"
                                >
                                    {/* Public/Private Setting */}
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                                        <div className="space-y-1">
                                            <Label className="flex items-center gap-2 text-justify">
                                                <Users className="w-4 h-4" />
                                                Public Question
                                            </Label>
                                            <p className="text-xs text-white/60 text-justify">Visible to all participants</p>
                                        </div>
                                        <Switch
                                            checked={newQuizQuestion.isPublic}
                                            onCheckedChange={(checked) => setNewQuizQuestion(prev => ({ ...prev, isPublic: checked }))}
                                            className={`${newQuizQuestion.isPublic ? 'bg-green-500' : 'bg-gray-600'}`}
                                        />
                                    </div>

                                    {/* Attempts Allowed */}
                                    <div className="p-4 rounded-xl bg-white/[0.04] border border-line space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-base flex items-center gap-2 text-justify">
                                                    <InfinityIcon className="w-4 h-4" />
                                                    Allowed Attempts
                                                </Label>
                                                <p className="text-xs text-white/50 text-justify">
                                                    Limit how many times students can answer
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold flex items-center gap-1 ${newQuizQuestion.attemptsAllowed === 0 ? 'text-purple-400' : 'text-white/40'} text-justify`}>
                                                    {newQuizQuestion.attemptsAllowed === 0 && <Sparkles className="w-3 h-3" />}
                                                    {newQuizQuestion.attemptsAllowed === 0 ? 'Unlimited' : 'Limited'}
                                                </span>
                                                <Switch
                                                    checked={newQuizQuestion.attemptsAllowed === 0}
                                                    onCheckedChange={(checked) => setNewQuizQuestion(prev => ({ ...prev, attemptsAllowed: checked ? 0 : 1 }))}
                                                    className={`${newQuizQuestion.attemptsAllowed === 0 ? 'bg-purple-500' : 'bg-gray-600'}`}
                                                />
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {newQuizQuestion.attemptsAllowed !== 0 && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <Input
                                                                    type="number"
                                                                    min={1}
                                                                    max={10}
                                                                    value={newQuizQuestion.attemptsAllowed}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value);
                                                                        if (val > 0) setNewQuizQuestion(prev => ({ ...prev, attemptsAllowed: val }));
                                                                    }}
                                                                    className="bg-black/50 border-purple-500/30 h-10 w-24 text-center font-bold text-lg"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent animate-pulse"></div>
                                                            </div>
                                                            <span className="text-sm text-white/60 text-justify">times</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex gap-3 pt-4"
                    >
                        <Button 
                            onClick={sendQuizQuestion} 
                            className={`flex-1 ${themes[activeColorTheme].button} text-white font-bold py-6 rounded-xl transition-all duration-300 hover:scale-[1.02] text-justify`}
                        >
                            <Send className="mr-2 h-5 w-5" />
                            <span className="text-lg text-justify">Send Question</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 bg-transparent border-white/20 hover:bg-white/10 hover:border-white/30 py-6 rounded-xl transition-all duration-300 text-justify"
                        >
                            Cancel
                        </Button>
                    </motion.div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Add missing Settings icon component
const Settings = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export default NewQuestionModal;