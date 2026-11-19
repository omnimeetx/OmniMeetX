import React from 'react';
import { ListChecks, FileText, Volume2, Mail, Trello, GitBranch, FileCode, Wand2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MeetingInsight, FollowUpTask, Participant } from './types';

interface TasksPanelProps {
    followUpTasks: FollowUpTask[];
    meetingInsights: MeetingInsight[];
    speakingDistribution: { [key: string]: number };
    participants: Participant[];
    dominantSpeaker: string;
    userEmail?: string;
    onCreateFollowUpTask?: () => void;
}

const TasksPanel: React.FC<TasksPanelProps> = ({
    followUpTasks,
    meetingInsights,
    speakingDistribution,
    participants,
    dominantSpeaker,
    userEmail,
    onCreateFollowUpTask
}) => {
    const renderFollowUpTasks = () => (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ListChecks className="text-green-500" size={20} />
                    <h4 className="font-medium">Follow-up Tasks</h4>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                    {followUpTasks.filter(t => t.status === 'completed').length}/{followUpTasks.length}
                </span>
            </div>

            {followUpTasks.slice(-3).map((task) => (
                <div key={task.id} className="p-3 bg-white/5 rounded-lg border-l-4 border-green-500/50">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">{task.title}</span>
                        <div className="flex items-center gap-1">
                            {task.type === 'email' && <Mail size={12} />}
                            {task.type === 'trello' && <Trello size={12} />}
                            {task.type === 'jira' && <GitBranch size={12} />}
                            {task.type === 'code' && <FileCode size={12} />}
                            <span className={`text-xs px-2 py-0.5 rounded ${task.status === 'completed' ? 'bg-green-500/30 text-green-400' :
                                task.status === 'processing' ? 'bg-yellow-500/30 text-yellow-400' :
                                    'bg-gray-500/30 text-gray-400'
                                }`}>
                                {task.status}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs opacity-70 mb-1">To: {task.assignedTo.join(', ')}</p>
                    <p className="text-xs">{task.description}</p>
                </div>
            ))}

            {onCreateFollowUpTask && userEmail && (
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => onCreateFollowUpTask()}
                >
                    <Wand2 size={14} className="mr-2" />
                    Auto-create Follow-up
                </Button>
            )}
        </div>
    );

    const renderMeetingInsights = () => (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="text-indigo-500" size={20} />
                    <h4 className="font-medium">Meeting Insights</h4>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-400">
                    {meetingInsights.length} items
                </span>
            </div>

            {meetingInsights.slice(-3).map((insight) => (
                <div key={insight.id} className="p-3 bg-white/5 rounded-lg border-l-4 border-indigo-500/50">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium capitalize">{insight.type.replace('_', ' ')}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${insight.priority === 'high' ? 'bg-red-500/30 text-red-400' :
                            insight.priority === 'medium' ? 'bg-yellow-500/30 text-yellow-400' :
                                'bg-green-500/30 text-green-400'}`}>
                            {insight.priority}
                        </span>
                    </div>
                    <p className="text-xs mb-2">{insight.text}</p>
                    <p className="text-xs opacity-70">By: {insight.participants.join(', ')}</p>
                </div>
            ))}
        </div>
    );

    const renderSpeakingDistribution = () => {
        const totalSpeakingTime = Object.values(speakingDistribution).reduce((a, b) => a + b, 1);
        const speakingData = participants
            .filter(p => !p.isBot)
            .map(p => ({
                name: p.name,
                percentage: Math.round(((speakingDistribution[p.id] || 0) / totalSpeakingTime) * 100),
                isDominant: p.id === dominantSpeaker
            }))
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 3);

        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Volume2 className="text-cyan-500" size={20} />
                    <h4 className="font-medium">Speaking Time</h4>
                </div>

                <div className="space-y-2">
                    {speakingData.map((data, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${data.isDominant ? 'bg-cyan-400' : 'bg-white/40'}`} />
                                    <span className={data.isDominant ? 'font-medium' : ''}>{data.name}</span>
                                    {data.isDominant && <Badge variant="outline" className="h-4 text-[10px]">Dominant</Badge>}
                                </div>
                                <span>{data.percentage}%</span>
                            </div>
                            <Progress value={data.percentage} className="h-1.5" />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {renderFollowUpTasks()}
            {renderMeetingInsights()}
            {renderSpeakingDistribution()}
        </div>
    );
};

export default TasksPanel;