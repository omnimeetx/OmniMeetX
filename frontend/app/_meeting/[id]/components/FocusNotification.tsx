import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, Eye } from 'lucide-react';

interface FocusNotification {
    id: string;
    userId: string;
    userName: string;
    isFocused: boolean;
    timestamp: Date;
}

interface FocusNotificationProps {
    notifications: FocusNotification[];
}

const FocusNotificationComponent: React.FC<FocusNotificationProps> = ({ notifications }) => {
    const [visibleNotifications, setVisibleNotifications] = useState<FocusNotification[]>([]);

    useEffect(() => {
        // Only show "not focused" notifications
        const unfocusedNotifications = notifications.filter(n => !n.isFocused);
        setVisibleNotifications(unfocusedNotifications);

        // Auto-remove notifications after 10 seconds
        const timer = setTimeout(() => {
            setVisibleNotifications([]);
        }, 10000);

        return () => clearTimeout(timer);
    }, [notifications]);

    return (
        <div className="fixed left-4 top-20 z-50 flex flex-col gap-2 max-w-xs">
            <AnimatePresence>
                {visibleNotifications.map((notification) => (
                    <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 backdrop-blur-xl flex items-center gap-3"
                    >
                        <div className="bg-yellow-500/20 rounded-lg p-2">
                            <EyeOff size={16} className="text-yellow-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-yellow-300">
                                {notification.userName}
                            </p>
                            <p className="text-xs text-yellow-400/70">
                                Switched tabs or minimized
                            </p>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default FocusNotificationComponent;
