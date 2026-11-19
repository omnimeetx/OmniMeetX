import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AIPanel from '../AIPanel';
import { ChatMessage, GhostReplay } from '../types';

interface AIChatModalProps {
    isOpen: boolean;
    onClose: () => void;
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
}

const AIChatModal: React.FC<AIChatModalProps> = ({
    isOpen,
    onClose,
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
    fileInputRef
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-canvas border-line text-white max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>AI Assistant Chat</DialogTitle>
                    <DialogDescription className="text-white/60">
                        Ghost Replays • Auto-execution • Multi-mode • Commands
                    </DialogDescription>
                </DialogHeader>
                <AIPanel
                    aiMessages={aiMessages}
                    aiChatInput={aiChatInput}
                    setAiChatInput={setAiChatInput}
                    sendAIChatMessage={sendAIChatMessage}
                    ghostReplays={ghostReplays}
                    requestGhostReplay={requestGhostReplay}
                    activeGhostReplay={activeGhostReplay}
                    chatMode={chatMode}
                    setChatMode={setChatMode}
                    isRecordingVoice={isRecordingVoice}
                    startVoiceRecording={startVoiceRecording}
                    fileInputRef={fileInputRef}
                />
            </DialogContent>
        </Dialog>
    );
};

export default AIChatModal;