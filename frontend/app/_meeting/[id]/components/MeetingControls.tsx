import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Video, VideoOff, Monitor, Hand, Smile,
    MoreVertical, PhoneOff, Brain, MessageSquare,
    ChevronRight, Users2, GraduationCap, ListChecks,
    MessageCircle, Globe, Captions, Plus, X, Share
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';

// Pulse animation for active states (Mic ON, Video ON, Recording ON)
const pulseAnimation: any = {
    scale: [1, 1.05, 1],
    transition: {
        duration: 2,
        repeat: Infinity,
        ease: [0.42, 0, 0.58, 1]
    }
};

interface MeetingControlsProps {
    showControls: boolean;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    isHandRaised: boolean;
    isAIEnabled: boolean;
    isRecording: boolean;
    isOwner: boolean;
    selectedLanguage: string;
    targetLanguage: string;
    isLiveTranslationEnabled: boolean;
    isCaptionsEnabled: boolean;
    aiMode: 'private' | 'group';
    aiSensitivity: number;
    activeTab: string;
    isSidebarOpen: boolean;

    onToggleAudio: () => void;
    onToggleVideo: () => void;
    onToggleScreenShare: (options?: { isRestart?: boolean }) => void;
    onToggleHand: () => void;
    onToggleRecording: () => void;
    autoRecord?: boolean;
    onLeaveMeeting: () => void;
    onToggleSidebar: () => void;
    onSendReaction: (emoji: string) => void;
    onSetAIEnabled: (enabled: boolean) => void;
    onSetAiMode: (mode: 'private' | 'group') => void;
    onSetAiSensitivity: (value: number) => void;
    onSetSelectedLanguage: (lang: string) => void;
    onSetTargetLanguage: (lang: string) => void;
    onSetLiveTranslationEnabled: (enabled: boolean) => void;
    onSetCaptionsEnabled: (enabled: boolean) => void;
    onOpenAIChat: () => void;
    onOpenNewQuestionForm: () => void;
    onSetActiveTab: (tab: string) => void;
    onStartVoiceRecording: () => void;

    meetingId: string;
    socketRef: any;
}

const MeetingControls: React.FC<MeetingControlsProps> = ({
    showControls,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isHandRaised,
    isAIEnabled,
    isRecording,
    isOwner,
    selectedLanguage,
    targetLanguage,
    isLiveTranslationEnabled,
    isCaptionsEnabled,
    aiMode,
    aiSensitivity,
    activeTab,
    isSidebarOpen,

    onToggleAudio,
    onToggleVideo,
    onToggleScreenShare,
    onToggleHand,
    onToggleRecording,
    autoRecord,
    onLeaveMeeting,
    onToggleSidebar,
    onSendReaction,
    onSetAIEnabled,
    onSetAiMode,
    onSetAiSensitivity,
    onSetSelectedLanguage,
    onSetTargetLanguage,
    onSetLiveTranslationEnabled,
    onSetCaptionsEnabled,
    onOpenAIChat,
    onOpenNewQuestionForm,
    onSetActiveTab,

    meetingId,
    socketRef
}) => {
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '🤔', '❓', '⚠️', '👀', '💡', '🚀', '✅', '❌'];
    const languages = [
        { code: "en", name: "English" }, { code: "es", name: "Spanish" },
        { code: "fr", name: "French" }, { code: "de", name: "German" },
        { code: "zh", name: "Chinese" }, { code: "ja", name: "Japanese" },
    ];

    return (
        <div className="fixed inset-x-0 bottom-0 pointer-events-none z-50 flex flex-col items-center">
            {/* Main Control Bar */}
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: showControls ? -24 : 100 }}
                className="pointer-events-auto max-w-[95vw]"
            >
                <div className="bg-canvas/90 backdrop-blur-2xl border border-white/20 p-2 md:p-3 rounded-full md:rounded-[2rem] flex items-center gap-1.5 md:gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-x-auto scrollbar-hide max-w-full">

                    {/* Mic Toggle */}
                    <motion.button
                        animate={isAudioEnabled ? pulseAnimation : {}}
                        onClick={onToggleAudio}
                        className={`p-2.5 md:p-4 rounded-full transition-all duration-300 flex-shrink-0 ${isAudioEnabled
                            ? 'bg-emerald-500 text-white'
                            : 'bg-red-500/20 text-red-500 border border-red-500/40 hover:bg-red-500/30'
                            }`}
                    >
                        {isAudioEnabled ? <Mic size={20} className="w-5 h-5 md:w-5 md:h-5" /> : <MicOff size={20} className="w-5 h-5 md:w-5 md:h-5" />}
                    </motion.button>

                    {/* Video Toggle */}
                    <motion.button
                        animate={isVideoEnabled ? pulseAnimation : {}}
                        onClick={onToggleVideo}
                        className={`p-2.5 md:p-4 rounded-full transition-all duration-300 flex-shrink-0 ${isVideoEnabled
                            ? 'bg-blue-500 text-white'
                            : 'bg-red-500/20 text-red-500 border border-red-500/40 hover:bg-red-500/30'
                            }`}
                    >
                        {isVideoEnabled ? <Video size={20} className="w-5 h-5 md:w-5 md:h-5" /> : <VideoOff size={20} className="w-5 h-5 md:w-5 md:h-5" />}
                    </motion.button>

                    {/* Screen Share Toggle */}
                    {/* Screen Share Toggle */}
                    {isScreenSharing ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="p-3 md:p-4 rounded-full transition-all duration-300 border bg-amber-500 border-amber-400 text-white shadow-[0_0_20px_rgba(var(--warn-rgb),0.4)]"
                                >
                                    <Monitor size={20} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 bg-black/95 border-white/20 backdrop-blur-2xl text-white mb-6 p-2 rounded-xl">
                                <DropdownMenuItem
                                    onClick={() => onToggleScreenShare({ isRestart: true })}
                                    className="flex items-center gap-2 p-3 hover-gradient-btn rounded-lg cursor-pointer"
                                >
                                    <Share size={16} className="text-blue-400" />
                                    <span>Share something else</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => onToggleScreenShare()}
                                    className="flex items-center gap-2 p-3 hover-gradient-btn text-red-400 rounded-lg cursor-pointer hover:text-red-300"
                                >
                                    <Monitor size={16} />
                                    <span>Stop sharing</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <button
                            onClick={() => onToggleScreenShare()}
                            className="p-3 md:p-4 rounded-full transition-all duration-300 border bg-white/10 border-line text-white hover:bg-white/20"
                        >
                            <Monitor size={20} />
                        </button>
                    )}

                    {/* Hand Raise Toggle */}
                    <button
                        onClick={onToggleHand}
                        className={`p-3 md:p-4 rounded-full transition-all duration-300 border ${isHandRaised
                            ? 'bg-yellow-400 border-yellow-300 text-black'
                            : 'bg-white/10 border-line text-white hover:bg-white/20'
                            }`}
                    >
                        <Hand size={20} className={isHandRaised ? 'fill-current' : ''} />
                    </button>

                    {/* Reaction Picker */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="p-3 md:p-4 rounded-full bg-white/10 border border-line text-white hover:bg-white/20 transition-all">
                                <Smile size={20} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 bg-black/95 border-white/20 backdrop-blur-2xl p-2 mb-4">
                            <div className="grid grid-cols-5 gap-1">
                                {emojis.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => onSendReaction(emoji)}
                                        className="p-2 hover:bg-white/10 rounded-lg text-xl hover:scale-125 transition-transform"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="w-[1px] h-10 bg-white/20 mx-1" />

                    {/* Recording Button */}
                    <div className="relative group/rec">
                        <motion.button
                            animate={isRecording ? pulseAnimation : (autoRecord && !isRecording) ? {
                                scale: [1, 1.08, 1],
                                transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                            } : {}}
                            onClick={onToggleRecording}
                            className={`p-3 md:p-4 rounded-full border transition-all ${isRecording
                                ? 'bg-red-600 border-red-400 text-white shadow-[0_0_20px_rgba(var(--danger-rgb),0.5)]'
                                : autoRecord
                                    ? 'bg-red-500/20 border-red-400/50 text-red-300 hover:bg-red-500/30'
                                    : 'bg-white/10 border-line text-white hover:bg-white/20'
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isRecording ? 'border-white' : 'border-current'}`}>
                                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-current'}`} />
                            </div>
                        </motion.button>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/rec:opacity-100 transition-opacity pointer-events-none">
                            {isRecording ? 'Stop recording' : 'Record meeting screen and audio'}
                        </div>
                    </div>

                    {/* Chat Toggle (Direct to Chat) */}
                    <button
                        onClick={() => {
                            if (isSidebarOpen) {
                                onToggleSidebar();
                            } else {
                                onSetActiveTab('chat');
                                onToggleSidebar();
                            }
                        }}
                        className={`p-3 md:p-4 rounded-full border transition-all ${isSidebarOpen
                            ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                            : 'bg-white/10 border-line text-white hover:bg-white/20'
                            }`}
                    >
                        {isSidebarOpen ? <X size={20} /> : <MessageSquare size={20} />}
                    </button>

                    {/* More Settings / Sidebar Toggle */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-3 md:p-4 rounded-full bg-white/10 border border-line text-white hover:bg-white/20 transition-all">
                                <MoreVertical size={20} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64 bg-black/95 border-white/20 backdrop-blur-2xl text-white mb-6 p-4 rounded-2xl">
                            <DropdownMenuLabel>Meeting Options</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <div className="space-y-4 py-2">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-white hover:bg-white/10"
                                    onClick={onToggleSidebar}
                                >
                                    <ListChecks size={16} className="mr-2" /> Show Sidebar
                                </Button>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2"><Captions size={16} /><span>Captions</span></div>
                                    <Switch checked={isCaptionsEnabled} onCheckedChange={onSetCaptionsEnabled} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2"><Globe size={16} /><span>Live Translation</span></div>
                                    <Switch checked={isLiveTranslationEnabled} onCheckedChange={onSetLiveTranslationEnabled} />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] text-white/50 uppercase">Primary Language</label>
                                    <Select value={selectedLanguage} onValueChange={onSetSelectedLanguage}>
                                        <SelectTrigger className="h-8 bg-white/5 border-line text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-canvas border-line text-white z-[60]">
                                            {languages.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-line">
                                    <DropdownMenuLabel className="flex items-center gap-2 px-0 text-purple-400">
                                        <Brain size={16} /> AI Settings
                                    </DropdownMenuLabel>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Enable AI</span>
                                        <Switch checked={isAIEnabled} onCheckedChange={onSetAIEnabled} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-white/50 uppercase">Mode</label>
                                        <Select value={aiMode} onValueChange={(v: 'private' | 'group') => onSetAiMode(v)}>
                                            <SelectTrigger className="bg-white/5 border-line h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-canvas border-line text-white z-[60]">
                                                <SelectItem value="private">Private (Solo)</SelectItem>
                                                <SelectItem value="group">Group (Public)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {isOwner && (
                                    <Button
                                        onClick={() => socketRef?.current?.emit('summon-bot', { meetingId })}
                                        className="w-full h-8 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/40 mt-2"
                                    >
                                        🤖 Summon AI Bot
                                    </Button>
                                )}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Quiz Quick Action (Owner Only) */}
                    {isOwner && (
                        <button
                            onClick={onOpenNewQuestionForm}
                            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-all text-sm font-medium"
                        >
                            <Plus size={16} /> Quiz
                        </button>
                    )}

                    {/* Leave Meeting */}
                    <button
                        onClick={onLeaveMeeting}
                        className="p-3 md:p-4 rounded-full bg-red-600 border border-red-500 text-white hover:bg-red-700 transition-all shadow-xl active:scale-90"
                    >
                        <PhoneOff size={20} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default MeetingControls;