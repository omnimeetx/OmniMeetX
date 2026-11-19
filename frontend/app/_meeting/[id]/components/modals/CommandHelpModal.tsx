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
import { Command, Video, Brain, Users, FileText, HelpCircle, Volume2, Monitor } from 'lucide-react';

interface CommandHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CommandHelpModal: React.FC<CommandHelpModalProps> = ({ isOpen, onClose }) => {
    const commandCategories = [
        {
            title: "Meeting Control",
            icon: <Video size={16} />,
            commands: [
                { command: "/record start", description: "Start recording the meeting" },
                { command: "/record stop", description: "Stop recording" },
                { command: "/mute-all", description: "Mute all participants (owner only)" },
                { command: "/clear-chat", description: "Clear the chat history" },
            ]
        },
        {
            title: "AI Features",
            icon: <Brain size={16} />,
            commands: [
                { command: "/summarize", description: "Generate meeting summary" },
                { command: "/translate [lang]", description: "Enable translation to specified language" },
                { command: "/next-speaker", description: "Suggest next speaker" },
                { command: "/show-decisions", description: "Show all recorded decisions" },
            ]
        },
        {
            title: "Quiz System",
            icon: <Users size={16} />,
            commands: [
                { command: "/start-quiz [title]", description: "Start a new quiz session" },
                { command: "/end-quiz", description: "End current quiz session" },
                { command: "/highlight [text]", description: "Find messages containing text" },
            ]
        },
        {
            title: "Media Control",
            icon: <Monitor size={16} />,
            commands: [
                { command: "Click video icon", description: "Toggle your video" },
                { command: "Click microphone icon", description: "Toggle your audio" },
                { command: "Click screen icon", description: "Start/stop screen share" },
                { command: "Click hand icon", description: "Raise/lower hand" },
            ]
        },
        {
            title: "AI Assistant",
            icon: <Brain size={16} />,
            commands: [
                { command: "Type /help", description: "Show this help menu" },
                { command: "Ask: 'What did X say?'", description: "Ghost replay of past conversation" },
                { command: "Ask: 'Create task for...'", description: "Auto-create follow-up tasks" },
                { command: "React with emojis", description: "Send floating reactions" },
            ]
        },
        {
            title: "Quick Tips",
            icon: <HelpCircle size={16} />,
            tips: [
                "Use voice mode for hands-free interaction",
                "Upload images for AI analysis",
                "Pin important messages for quick reference",
                "Use private AI mode for personal insights",
            ]
        }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-canvas border-line text-white max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Command size={20} />
                        Command Bot Help
                    </DialogTitle>
                    <DialogDescription className="text-white/60">
                        Control the meeting through chat commands and AI features
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {commandCategories.map((category, index) => (
                            <div key={index} className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-white/10">
                                        {category.icon}
                                    </div>
                                    <h4 className="font-semibold text-sm">{category.title}</h4>
                                </div>
                                
                                {'commands' in category ? (
                                    <div className="space-y-1.5">
                                        {category.commands.map((cmd, cmdIndex) => (
                                            <div key={cmdIndex} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                                <code className="block font-mono text-xs text-primary mb-0.5">
                                                    {cmd.command}
                                                </code>
                                                <p className="text-xs text-white/70">{cmd.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {category.tips.map((tip, tipIndex) => (
                                            <div key={tipIndex} className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                                                <p className="text-xs text-white/70 flex-1">{tip}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Advanced Features Section */}
                    <div className="space-y-4 p-4 bg-white/5 rounded-lg">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Brain size={16} />
                            Advanced AI Features
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <h5 className="text-xs font-medium text-purple-300">Ghost Replay</h5>
                                <p className="text-xs text-white/60">
                                    Ask the AI to replay any moment from the meeting:
                                </p>
                                <div className="space-y-1 text-xs italic">
                                    <p>"Replay what John said about the budget"</p>
                                    <p>"What did Sarah say about the deadline?"</p>
                                    <p>"Play the confusing part again"</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h5 className="text-xs font-medium text-green-300">Auto-execution</h5>
                                <p className="text-xs text-white/60">
                                    Automatically create follow-up tasks:
                                </p>
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">📧 Email</span>
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">📋 Trello</span>
                                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">🎫 Jira</span>
                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">📝 Notion</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Voice Commands */}
                    <div className="space-y-3 p-4 bg-white/5 rounded-lg">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Volume2 size={16} />
                            Voice Commands
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="p-2 bg-white/5 rounded text-center">
                                <p className="text-xs font-medium">"Start recording"</p>
                            </div>
                            <div className="p-2 bg-white/5 rounded text-center">
                                <p className="text-xs font-medium">"Mute everyone"</p>
                            </div>
                            <div className="p-2 bg-white/5 rounded text-center">
                                <p className="text-xs font-medium">"Next speaker"</p>
                            </div>
                            <div className="p-2 bg-white/5 rounded text-center">
                                <p className="text-xs font-medium">"Show decisions"</p>
                            </div>
                        </div>
                        <p className="text-xs text-white/60">
                            Speak naturally to the AI assistant for voice commands
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={onClose} className="w-full">
                        Got it!
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CommandHelpModal;