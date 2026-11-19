import React from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface MeetingHeaderProps {
    meetingId: string;
    currentMood: 'positive' | 'neutral' | 'negative';
    moodIntensity: number;
    onCopyMeetingLink: () => Promise<{ success: boolean; message: string }>;
}

const MeetingHeader: React.FC<MeetingHeaderProps> = ({
    meetingId,
    currentMood,
    moodIntensity,
    onCopyMeetingLink
}) => {
    const handleCopyClick = async () => {
        const result = await onCopyMeetingLink();
        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
    };

    const getMoodColor = () => {
        switch (currentMood) {
            case 'positive': return 'bg-green-500/20 border-green-500/30';
            case 'negative': return 'bg-red-500/20 border-red-500/30';
            default: return 'bg-yellow-500/20 border-yellow-500/30';
        }
    };

    const getDotColor = () => {
        switch (currentMood) {
            case 'positive': return 'bg-green-400';
            case 'negative': return 'bg-red-400';
            default: return 'bg-yellow-400';
        }
    };

    return (
        <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
            <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium tracking-wide">LIVE</span>
                <div className="h-4 w-[1px] bg-white/10 mx-2" />
                <span className="text-sm text-white/70">{meetingId}</span>
                <button onClick={handleCopyClick} className="ml-2 hover:text-primary transition-colors">
                    <Copy size={14} />
                </button>
            </div>
        </div>
    );
};

export default MeetingHeader;