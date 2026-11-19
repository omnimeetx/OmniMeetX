import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChatMessage } from './types';
import { Send, Mic, Square, Pin, PinOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ChatPanelProps {
    chatMessages: ChatMessage[];
    chatInput: string;
    setChatInput: (value: string) => void;
    handleChatSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    userName: string;
    chatScrollRef: React.RefObject<HTMLDivElement>;
    messageReactions: { [key: string]: { [emoji: string]: number } };
    sendMessageReaction: (messageId: string, emoji: string) => void;
    pinnedMessage: ChatMessage | null;
    setPinnedMessage: (message: ChatMessage | null) => void;
    socketRef?: React.MutableRefObject<any>;
    meetingId?: string;
}

const QUICK_REACTIONS = ['👍', '😂', '❤️', '😮', '👎'];
const MAX_AUDIO_DURATION = 30; // seconds

const ChatPanel: React.FC<ChatPanelProps> = ({
    chatMessages,
    chatInput,
    setChatInput,
    handleChatSubmit,
    userName,
    chatScrollRef,
    messageReactions,
    sendMessageReaction,
    pinnedMessage,
    setPinnedMessage,
    socketRef,
    meetingId
}) => {
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const startAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);

                // Convert to base64 and send via socket
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    if (socketRef?.current) {
                        socketRef.current.emit('chat-message', {
                            id: Date.now().toString(),
                            userId: socketRef.current.id || 'me',
                            userName,
                            text: `🎤 Voice message (${recordingDuration}s)`,
                            timestamp: new Date(),
                            meetingId,
                            attachment: { type: 'audio', url: base64, name: `voice-${Date.now()}.webm` }
                        });
                    }
                };
                reader.readAsDataURL(audioBlob);

                setIsRecordingAudio(false);
                setRecordingDuration(0);
                if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecordingAudio(true);
            setRecordingDuration(0);

            // Timer with 30s limit
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => {
                    if (prev >= MAX_AUDIO_DURATION - 1) {
                        toast.error('Maximum recording limit (30s) reached');
                        stopAudioRecording();
                        return MAX_AUDIO_DURATION;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            console.error('Failed to start audio recording:', err);
        }
    };

    const stopAudioRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Pinned Message */}
            {pinnedMessage && (
                <div className="mb-3 p-2.5 bg-primary/10 border border-primary/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                            <Pin size={12} className="text-primary" />
                            <span className="text-xs font-medium text-primary">Pinned</span>
                            <span className="text-xs text-white/50">by {pinnedMessage.userName}</span>
                        </div>
                        <button onClick={() => setPinnedMessage(null)} className="text-white/40 hover:text-white/80 transition-colors">
                            <PinOff size={14} />
                        </button>
                    </div>
                    <p className="text-sm text-white/80">{pinnedMessage.text}</p>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 space-y-3 overflow-y-auto mb-3 meeting-scrollable" ref={chatScrollRef}>
                {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/30">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                            <span className="text-xl">💬</span>
                        </div>
                        <p className="text-sm">No messages yet</p>
                    </div>
                ) : (
                    chatMessages.map((msg, idx) => {
                        const isOwn = msg.userName === userName;
                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.1) }}
                                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                                onMouseEnter={() => setHoveredMessageId(msg.id)}
                                onMouseLeave={() => setHoveredMessageId(null)}
                            >
                                {/* Sender name (others only) */}
                                {!isOwn && (
                                    <span className="text-[11px] text-white/50 font-medium ml-1 mb-0.5">{msg.userName}</span>
                                )}

                                {/* Message bubble */}
                                <div className={`relative px-3 py-2 rounded-2xl max-w-[85%] text-sm break-words ${isOwn
                                    ? 'bg-primary text-white rounded-br-sm'
                                    : msg.isAI
                                        ? 'bg-blue-500/15 border border-blue-500/20 text-blue-200 rounded-bl-sm'
                                        : msg.isCommand
                                            ? 'bg-purple-500/15 border border-purple-500/20 text-purple-200 rounded-bl-sm'
                                            : 'bg-white/8 text-white/90 rounded-bl-sm'
                                    }`}>
                                    <span className="whitespace-pre-wrap">{msg.text}</span>

                                    {/* Audio attachment */}
                                    {msg.attachment?.type === 'audio' && (
                                        <div className="mt-2">
                                            <audio src={msg.attachment.url} controls className="w-full h-8 rounded" />
                                        </div>
                                    )}

                                    {/* Image attachment */}
                                    {msg.attachment?.type === 'image' && (
                                        <div className="mt-2">
                                            <img src={msg.attachment.url} alt="Attachment" className="max-w-full max-h-48 object-cover rounded" />
                                        </div>
                                    )}
                                </div>

                                {/* Timestamp */}
                                <span className={`text-[10px] text-white/30 mt-0.5 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>

                                {/* Quick reactions bar (on hover) */}
                                {hoveredMessageId === msg.id && !msg.isCommand && (
                                    <div className={`flex items-center gap-0.5 mt-1 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                                        {QUICK_REACTIONS.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => sendMessageReaction(msg.id, emoji)}
                                                className="text-sm hover:scale-125 transition-transform px-0.5"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                        {msg !== pinnedMessage && (
                                            <button
                                                onClick={() => setPinnedMessage(msg)}
                                                className="text-white/30 hover:text-white/60 transition-colors ml-1"
                                            >
                                                <Pin size={12} />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Existing reactions */}
                                {messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).length > 0 && (
                                    <div className={`flex gap-1 mt-1 flex-wrap ${isOwn ? 'mr-1' : 'ml-1'}`}>
                                        {Object.entries(messageReactions[msg.id]).map(([emoji, count]) => (
                                            <button
                                                key={emoji}
                                                onClick={() => sendMessageReaction(msg.id, emoji)}
                                                className="text-xs bg-white/8 px-1.5 py-0.5 rounded-full hover:bg-white/15 transition-colors"
                                            >
                                                {emoji} {count}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="mt-auto">
                {/* Audio recording indicator */}
                {isRecordingAudio && (
                    <div className="flex items-center justify-between mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-xs text-red-300">Recording... {recordingDuration}s / {MAX_AUDIO_DURATION}s</span>
                        </div>
                        <Button size="sm" variant="destructive" onClick={stopAudioRecording} className="h-7 text-xs gap-1">
                            <Square size={10} /> Stop
                        </Button>
                    </div>
                )}

                <form onSubmit={handleChatSubmit} className="relative flex gap-2">
                    <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a message or /command..."
                        className="bg-white/5 border-line pr-10 focus:ring-primary/50 flex-1"
                    />
                    <div className="flex gap-1">
                        {/* Mic button */}
                        <button
                            type="button"
                            onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                            className={`p-2 rounded-full transition-colors ${isRecordingAudio ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-white/50 hover:text-white/80'}`}
                        >
                            {isRecordingAudio ? <Square size={16} /> : <Mic size={16} />}
                        </button>
                        {/* Send button */}
                        <button
                            type="submit"
                            disabled={!chatInput.trim()}
                            className="p-2 rounded-full hover:bg-white/10 text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatPanel;