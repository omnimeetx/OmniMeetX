import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MicOff, Hand, Search, Monitor, Video, VideoOff, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Clock, Crown as CrownIcon } from 'lucide-react';
import { Participant, ActivityEntry } from './types';
import { Input } from '@/components/ui/input';



// Helper function to format timestamp
const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    const hours = date.getHours();
    const mins = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const timeString = `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;

    if (diffMins < 1) return `Just now • ${timeString}`;
    if (diffMins < 60) return `${diffMins} min ago • ${timeString}`;
    if (diffHours < 24) {
        return timeString;
    }
    return date.toLocaleDateString();
};

interface ParticipantsPanelProps {
    participants: Participant[];
    emotionData: { [key: string]: string };
    activeReactions: { [key: string]: string };
    userName: string;
    isOwner: boolean;
    isVideoEnabled?: boolean;
    isAudioEnabled?: boolean;
    isScreenSharing?: boolean;
    activityLog?: ActivityEntry[];
}

const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
    participants,
    emotionData,
    activeReactions,
    userName,
    isOwner,
    isVideoEnabled = true,
    isAudioEnabled = true,
    isScreenSharing = false,
    activityLog = [] // Default empty
}) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [showActivity, setShowActivity] = React.useState(true);
    const [, setTick] = React.useState(0); // Force re-render for timestamps


    // Update timestamps every minute
    React.useEffect(() => {
        const timer = setInterval(() => {
            setTick(t => t + 1);
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    const allParticipants = [
        {
            id: 'local',
            name: `${userName} (Me)`,
            isOwner: isOwner,
            isTeacher: false,
            role: isOwner ? 'Host' : 'Participant',
            isAudioEnabled: isAudioEnabled,
            isVideoEnabled: isVideoEnabled,
            isHandRaised: false,
            isSpeaking: false,
            isBot: false,
            connectionQuality: 'good' as const,
            quizScore: 0,
            isScreenSharing: isScreenSharing // Assuming Participant type has this or we extend it locally for the list
        },
        ...participants
    ];

    const filteredParticipants = allParticipants.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedParticipants = [...filteredParticipants].sort((a, b) => {
        // Priority: Screen Share > Hand Raised > Speaking > Mic On > Others
        if (a.isScreenSharing && !b.isScreenSharing) return -1;
        if (!a.isScreenSharing && b.isScreenSharing) return 1;
        if (a.isHandRaised && !b.isHandRaised) return -1;
        if (!a.isHandRaised && b.isHandRaised) return 1;
        if (a.isSpeaking && !b.isSpeaking) return -1;
        if (!a.isSpeaking && b.isSpeaking) return 1;
        if (a.isAudioEnabled && !b.isAudioEnabled) return -1;
        if (!a.isAudioEnabled && b.isAudioEnabled) return 1;
        return 0;
    });



    return (
        <div className="space-y-4">
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <Input
                    placeholder="Search participants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-line text-white focus:ring-primary/50"
                />
            </div>

            {/* Activity Timeline */}
            {isOwner && activityLog.length > 0 && (
                <div className="mb-4">
                    <button
                        onClick={() => setShowActivity(!showActivity)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-line hover:bg-white/10 transition-all group"
                    >
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-blue-400" />
                            <span className="text-sm font-semibold text-white">Activity</span>
                            <span className="text-xs text-white/40">({activityLog.length})</span>
                        </div>
                        {showActivity ? (
                            <ChevronUp size={16} className="text-white/60 group-hover:text-white transition-colors" />
                        ) : (
                            <ChevronDown size={16} className="text-white/60 group-hover:text-white transition-colors" />
                        )}
                    </button>

                    {showActivity && (
                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                            {activityLog.map((entry, index) => (
                                <div
                                    key={entry.id}
                                    className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-line hover:bg-white/10 transition-all animate-fade-in"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className={`p-1.5 rounded-full ${entry.action === 'joined' ? 'bg-green-500/20' :
                                        entry.action === 'left' ? 'bg-red-500/20' :
                                            'bg-yellow-500/20'
                                        } shrink-0`}>
                                        {entry.action === 'joined' ? (
                                            <ArrowUp size={12} className="text-green-400" />
                                        ) : entry.action === 'left' ? (
                                            <ArrowDown size={12} className="text-red-400" />
                                        ) : (
                                            <CrownIcon size={12} className="text-yellow-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-white/90 truncate">
                                            <span className={`font-medium ${entry.action === 'joined' ? 'text-green-400' :
                                                entry.action === 'left' ? 'text-red-400' :
                                                    'text-white'
                                                }`}>{entry.participantName}</span>
                                            <span className={`ml-1 ${entry.action === 'joined' ? 'text-green-400' :
                                                entry.action === 'left' ? 'text-red-400' :
                                                    'text-yellow-400'
                                                }`}>
                                                {entry.action === 'became_host' ? 'became host' : entry.action}
                                            </span>
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-white/40 whitespace-nowrap shrink-0">
                                        {formatTimestamp(entry.timestamp)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-2">
                {sortedParticipants.map((p) => {
                    // Determine styling based on state
                    const isSpeaking = p.isSpeaking;
                    const isHandRaised = p.isHandRaised;
                    const isAudioEnabled = p.isAudioEnabled;

                    let glowClass = "";
                    if (p.isScreenSharing) glowClass = "shadow-[0_0_20px_rgba(var(--brand-rgb),0.4)] border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-400/50";
                    else if (isHandRaised) glowClass = "shadow-[0_0_20px_rgba(var(--warn-rgb),0.4)] border-yellow-500 bg-yellow-500/10 ring-1 ring-yellow-400/50";
                    else if (isSpeaking) glowClass = "bg-blue-500/10 animate-speaking-pulse-blue"; // Blue breathing for speaking
                    else if (p.isVideoEnabled) glowClass = "shadow-[0_0_15px_rgba(var(--sand-rgb),0.3)] border-purple-500/50 bg-purple-500/10";
                    else if (isAudioEnabled) glowClass = "shadow-[0_0_15px_rgba(var(--brand-rgb),0.3)] border-green-500/50 bg-green-500/5"; // Static glow for Mic On
                    else glowClass = "border-line bg-white/5 opacity-80 hover:bg-white/10 hover:border-white/20";

                    return (
                        <div
                            key={p.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${glowClass} hover:bg-white/10`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-inner
                                        ${p.isScreenSharing ? 'bg-white/[0.04] ring-2 ring-cyan-500/50' :
                                            isSpeaking ? 'bg-white/[0.04] ring-2 ring-blue-500/50' :
                                                p.isVideoEnabled ? 'bg-white/[0.04] ring-2 ring-purple-500/30' :
                                                    'bg-white/10'}
                                    `}>
                                        {p.isBot ? '🤖' : p.name.charAt(0)}
                                    </div>
                                    {emotionData[p.id] && (
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500/90 border-2 border-canvas flex items-center justify-center text-[10px] shadow-sm">
                                            {emotionData[p.id] === 'excited' ? '😃' :
                                                emotionData[p.id] === 'concerned' ? '😟' :
                                                    emotionData[p.id] === 'confident' ? '💪' : '😐'}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className={`text-sm font-medium truncate ${p.isScreenSharing ? 'text-cyan-400' :
                                            isSpeaking ? 'text-blue-400' :
                                                p.isVideoEnabled ? 'text-purple-300' :
                                                    'text-white'
                                            }`}>{p.name}</p>
                                        {p.isBot && <Badge variant="secondary" className="h-4 px-1 text-[10px]">AI</Badge>}
                                        {p.role && <Badge variant="outline" className="h-4 px-1 text-[10px] border-white/20">{p.role}</Badge>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {p.isScreenSharing ? (
                                            <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-medium animate-pulse">
                                                <Monitor size={10} />
                                                Sharing Screen
                                            </span>
                                        ) : isSpeaking ? (
                                            <span className="flex items-center gap-1 text-[10px] text-blue-400 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                Speaking...
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                {activeReactions[p.id] && (
                                    <div className="animate-bounce text-2xl drop-shadow-md">{activeReactions[p.id]}</div>
                                )}
                                {isHandRaised && (
                                    <div className="bg-yellow-500/20 p-1.5 rounded-full border border-yellow-500/50 animate-pulse">
                                        <span className="text-sm">✋</span>
                                    </div>
                                )}

                                {p.isVideoEnabled ? (
                                    <div className="p-1.5 rounded-full bg-purple-500/10 text-purple-400" title="Camera On">
                                        <Video size={14} />
                                    </div>
                                ) : (
                                    <div className="p-1.5 rounded-full bg-white/5 text-white/20" title="Camera Off">
                                        <VideoOff size={14} />
                                    </div>
                                )}

                                {isAudioEnabled ? (
                                    <div className="p-1.5 rounded-full bg-green-500/10 text-green-400" title="Mic On">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                                    </div>
                                ) : (
                                    <div className="p-1.5 rounded-full bg-red-500/10 text-red-400" title="Mic Off">
                                        <MicOff size={14} />
                                    </div>
                                )}

                                {p.isScreenSharing && (
                                    <div className="p-1.5 rounded-full bg-cyan-500/10 text-cyan-400 animate-pulse" title="Screen Sharing">
                                        <Monitor size={14} />
                                    </div>
                                )}

                                {p.connectionQuality === 'poor' && <span className="text-xs text-red-400" title="Poor Connection">⚠</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ParticipantsPanel;