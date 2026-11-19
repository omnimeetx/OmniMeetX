import React, { useRef, useEffect, useState } from 'react';
import { Brain, Volume2, ImageIcon, MessageSquare, Send, Play, Square } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GhostReplay, ChatMessage } from './types';

interface AIPanelProps {
    aiMessages: ChatMessage[];
    aiChatInput: string;
    setAiChatInput: (value: string) => void;
    sendAIChatMessage: (e: React.FormEvent) => void;
    ghostReplays: GhostReplay[];
    requestGhostReplay: (query: string) => void;
    activeGhostReplay: string | null;
    chatMode?: 'text' | 'voice' | 'image';
    setChatMode?: (mode: 'text' | 'voice' | 'image') => void;
    isRecordingVoice?: boolean;
    startVoiceRecording?: () => void;
    fileInputRef?: React.RefObject<HTMLInputElement>;
    liveTranscript: any[];
}

// Group transcript entries into paragraphs by speaker within 30 seconds
const groupTranscript = (entries: any[]) => {
    return entries.reduce((groups: any[], entry: any) => {
        const lastGroup = groups[groups.length - 1];
        const timeDiff = lastGroup
            ? (new Date(entry.timestamp).getTime() - new Date(lastGroup.timestamp).getTime()) / 1000
            : 999;

        if (lastGroup && lastGroup.speaker === entry.speaker && timeDiff < 30) {
            lastGroup.text += ' ' + entry.text;
        } else {
            groups.push({ ...entry });
        }
        return groups;
    }, []);
};

const AIPanel: React.FC<AIPanelProps> = ({
    aiMessages,
    aiChatInput,
    setAiChatInput,
    sendAIChatMessage,
    ghostReplays,
    requestGhostReplay,
    activeGhostReplay,
    chatMode = 'text',
    setChatMode,
    isRecordingVoice,
    startVoiceRecording,
    fileInputRef,
    liveTranscript
}) => {
    // Auto-scroll refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentSpeakingMsgId, setCurrentSpeakingMsgId] = useState<string | null>(null);

    // Auto-scroll AI messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [aiMessages]);

    // Auto-scroll transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [liveTranscript]);

    // Load voices async — browsers load voices asynchronously
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const loadVoices = () => window.speechSynthesis.getVoices();
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    // Ghost replay audio using Web Speech Synthesis
    const playGhostReplay = (text: string, msgId?: string) => {
        if (typeof window === 'undefined') return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 1.05;
        utterance.volume = 1;

        // Pick best available voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v =>
            v.name.includes('Google UK English Female') ||
            v.name.includes('Google US English') ||
            v.name.includes('Samantha') ||
            v.name.includes('Natural')
        );
        if (preferred) utterance.voice = preferred;

        // Track speaking state
        utterance.onstart = () => {
            setIsSpeaking(true);
            if (msgId) setCurrentSpeakingMsgId(msgId);
        };
        utterance.onend = () => {
            setIsSpeaking(false);
            setCurrentSpeakingMsgId(null);
        };
        utterance.onerror = () => {
            setIsSpeaking(false);
            setCurrentSpeakingMsgId(null);
        };

        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        if (typeof window !== 'undefined') {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setCurrentSpeakingMsgId(null);
        }
    };

    const grouped = groupTranscript(liveTranscript);

    return (
        <div className="flex flex-col h-full gap-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="text-primary" size={20} />
                    <h3 className="font-semibold">AI Assistant</h3>
                </div>
                <div className="flex items-center gap-2">
                    {isSpeaking && (
                        <Button size="sm" variant="destructive" onClick={stopSpeaking} className="h-7 text-xs gap-1">
                            <Square size={10} /> Stop
                        </Button>
                    )}
                    <Badge variant="default">Private</Badge>
                </div>
            </div>

            {setChatMode && (
                <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant={chatMode === 'text' ? 'default' : 'outline'} onClick={() => setChatMode('text')} className="flex-1">
                        <MessageSquare size={14} className="mr-1" /> Text
                    </Button>
                    <Button size="sm" variant={chatMode === 'voice' ? 'default' : 'outline'} onClick={startVoiceRecording} className="flex-1" disabled={isRecordingVoice}>
                        {isRecordingVoice ? (
                            <div className="flex items-center"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1" />Recording...</div>
                        ) : (
                            <><Volume2 size={14} className="mr-1" /> Voice</>
                        )}
                    </Button>
                    <Button size="sm" variant={chatMode === 'image' ? 'default' : 'outline'} onClick={() => fileInputRef?.current?.click()} className="flex-1">
                        <ImageIcon size={14} className="mr-1" /> Image
                    </Button>
                </div>
            )}

            {/* AI Messages with auto-scroll */}
            <div className="h-64 overflow-y-auto bg-white/5 rounded-lg p-3 space-y-3 meeting-scrollable">
                {aiMessages.map((msg) => (
                    <div key={msg.id} className={`p-3 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.isAI ? 'bg-primary/20 border border-primary/30' : 'bg-white/5'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{msg.userName}</span>
                            <span className="text-xs opacity-50">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                        {/* Play/Stop button for AI responses (ghost replay audio) */}
                        {msg.isAI && msg.text.length > 10 && (
                            currentSpeakingMsgId === msg.id ? (
                                <button
                                    onClick={stopSpeaking}
                                    className="mt-2 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    <Square size={12} /> Stop
                                </button>
                            ) : (
                                <button
                                    onClick={() => playGhostReplay(msg.text, msg.id)}
                                    className="mt-2 flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
                                >
                                    {isSpeaking ? <Volume2 size={12} className="animate-pulse" /> : <Play size={12} />}
                                    {isSpeaking ? 'Speaking...' : 'Listen'}
                                </button>
                            )
                        )}
                        {msg.attachment && (
                            <div className="mt-2 p-2 bg-black/20 rounded">
                                {msg.attachment.type === 'image' && (
                                    <img src={msg.attachment.url} alt="Attachment" className="max-w-full h-32 object-cover rounded" />
                                )}
                                {msg.attachment.type === 'audio' && (
                                    <div className="flex items-center gap-2">
                                        <Volume2 size={16} />
                                        <span className="text-xs">Voice message</span>
                                        <audio src={msg.attachment.url} controls className="h-6" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Live Transcript Section — Grouped Paragraphs */}
            <div className="space-y-2 flex-1 min-h-0">
                <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-primary">
                        <Volume2 size={14} />
                        Live Meeting Transcript
                    </h4>
                    <span className="text-[10px] opacity-40 uppercase tracking-tighter">Real-time</span>
                </div>
                <div className="h-48 overflow-y-auto bg-black/20 rounded-lg p-3 space-y-3 border border-line meeting-scrollable">
                    {grouped.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-white/20 italic text-center text-sm">
                            Waiting for speech...
                        </div>
                    ) : (
                        grouped.map((entry: any, idx: number) => (
                            <div key={idx} className="border-l-2 border-primary/30 pl-3 py-1.5 hover:bg-white/5 transition-colors rounded-r">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-xs text-primary/90">{entry.speaker}</span>
                                    <span className="text-[9px] opacity-30">
                                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm text-white/80 leading-relaxed">{entry.text}</p>
                            </div>
                        ))
                    )}
                    <div ref={transcriptEndRef} />
                </div>
            </div>

            {chatMode === 'text' && (
                <form onSubmit={sendAIChatMessage} className="relative mt-auto">
                    <Input
                        value={aiChatInput}
                        onChange={(e) => setAiChatInput(e.target.value)}
                        placeholder="Ask AI anything about the meeting..."
                        className="bg-white/5 border-line pr-10"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </form>
            )}

            {ghostReplays.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-medium text-sm">Ghost Replays</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto meeting-scrollable">
                        {ghostReplays.slice(-3).map((replay) => (
                            <div key={replay.id} className="p-2 bg-white/5 rounded text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{replay.userName}</span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={() => playGhostReplay(replay.text)}
                                    >
                                        <Play size={12} />
                                    </Button>
                                </div>
                                <p className="truncate">{replay.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIPanel;