'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, User, Clock } from 'lucide-react';

interface PendingUser {
    userId: string;
    userName: string;
    userEmail?: string;
    timestamp: string;
}

interface ApprovalNotificationProps {
    pendingUsers: PendingUser[];
    onApprove: (userId: string) => void;
    onReject: (userId: string) => void;
}

export default function ApprovalNotification({
    pendingUsers,
    onApprove,
    onReject
}: ApprovalNotificationProps) {
    if (pendingUsers.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 z-50 w-96 max-h-[500px] overflow-hidden"
        >
            <Card className="border-blue-500/30 bg-gray-900/95 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                        <User className="w-5 h-5 text-blue-400" />
                        <h3 className="font-semibold text-lg">
                            Pending Join Requests ({pendingUsers.length})
                        </h3>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                        <AnimatePresence>
                            {pendingUsers.map((user) => {
                                const requestTime = new Date(user.timestamp);
                                const timePassed = ((Date.now() - requestTime.getTime()) / 1000).toFixed(0);

                                return (
                                    <motion.div
                                        key={user.userId}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="p-3 rounded-lg bg-white/5 border border-line hover:border-blue-500/30 transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-full tile-accent flex items-center justify-center text-sm font-bold flex-shrink-0">
                                                    {user.userName[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{user.userName}</p>
                                                    {user.userEmail && (
                                                        <p className="text-xs text-gray-400 truncate">{user.userEmail}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                                            <Clock className="w-3 h-3" />
                                            <span>{timePassed}s ago</span>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => onApprove(user.userId)}
                                                size="sm"
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                Approve
                                            </Button>
                                            <Button
                                                onClick={() => onReject(user.userId)}
                                                size="sm"
                                                variant="destructive"
                                                className="flex-1"
                                            >
                                                <XCircle className="w-4 h-4 mr-1" />
                                                Reject
                                            </Button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </CardContent>
            </Card>

            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--brand-rgb), 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--brand-rgb), 0.7);
        }
      `}</style>
        </motion.div>
    );
}
