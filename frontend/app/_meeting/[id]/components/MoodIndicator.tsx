import React from 'react';

interface MoodIndicatorProps {
    currentMood: 'positive' | 'neutral' | 'negative';
    moodIntensity: number;
}

const MoodIndicator: React.FC<MoodIndicatorProps> = ({ currentMood, moodIntensity }) => {
    const getMoodColor = () => {
        switch (currentMood) {
            case 'positive': return 'bg-green-500/20 border-green-500/30 text-green-400';
            case 'negative': return 'bg-red-500/20 border-red-500/30 text-red-400';
            default: return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
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
        <div className="absolute top-6 right-6 z-10">
            <div className={`backdrop-blur-md bg-white/5 border border-line px-3 py-2 rounded-full flex items-center gap-2 ${getMoodColor()}`}>
                <div className={`w-2 h-2 rounded-full ${getDotColor()}`} />
                <span className="text-sm font-medium">
                    Mood: {currentMood.charAt(0).toUpperCase() + currentMood.slice(1)}
                </span>
                <span className="text-xs opacity-70">{moodIntensity}%</span>
            </div>
        </div>
    );
};

export default MoodIndicator;