import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface PostMeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: () => void;
    onDiscard: () => void;
    isUploading: boolean;
    uploadProgress?: number;
    uploadError?: boolean;
    // Keep other props optional
    meetingId?: string;
    title?: string;
    setTitle?: (title: string) => void;
    language?: string;
    setLanguage?: (lang: string) => void;
    languages?: Array<{ code: string; name: string }>;
    isLiveTranslationEnabled?: boolean;
    selectedLanguage?: string;
    targetLanguage?: string;
}

const PostMeetingModal: React.FC<PostMeetingModalProps> = ({
    isOpen,
    onClose,
    onUpload,
    onDiscard,
    isUploading,
    uploadProgress = 0,
    uploadError = false,
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={isUploading ? undefined : onClose}>
            <DialogContent className="bg-canvas border-line text-white max-w-md">
                <DialogHeader>
                    <div className="flex flex-col items-center gap-4 pt-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                            <Video className="w-8 h-8 text-primary" />
                        </div>
                        <DialogTitle className="text-xl text-center">
                            Meeting Recorded Successfully
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="py-6 text-center space-y-2">
                    <p className="text-white/60">
                        Your meeting recording is ready. Would you like to generate AI meeting notes and insights?
                    </p>
                </div>

                {/* Progress bar (visible during upload) */}
                {isUploading && (
                    <div className="px-4 pb-2">
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-primary/10 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            />
                        </div>
                        <p className="text-xs text-white/40 text-center mt-2">
                            {uploadProgress < 90 ? 'Uploading recording...' : uploadProgress < 100 ? 'Finalizing...' : 'Complete!'}
                        </p>
                    </div>
                )}

                <div className="flex flex-col gap-3 pb-4">
                    {uploadError ? (
                        <>
                            <p className="text-sm text-red-400 text-center">
                                Upload failed. Please try again.
                            </p>
                            <Button
                                className="w-full bg-primary hover:bg-primary/90 py-6 text-lg flex items-center justify-center gap-2"
                                onClick={onUpload}
                                disabled={isUploading}
                            >
                                <RefreshCw size={18} />
                                Retry Upload
                            </Button>
                        </>
                    ) : (
                        <Button
                            className="w-full bg-primary hover:bg-primary/90 py-6 text-lg"
                            onClick={onUpload}
                            disabled={isUploading}
                        >
                            {isUploading ? 'Uploading & Processing...' : 'Yes, Generate Notes'}
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        className="w-full border-line hover:bg-white/5 py-6 text-lg hover:text-white"
                        onClick={onDiscard}
                        disabled={isUploading}
                    >
                        No Thanks
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PostMeetingModal;