'use client';

/**
 * Plays every remote participant's audio.
 *
 * The video tiles cannot be relied on for this: when someone turns their camera
 * off the grid renders an avatar instead of a <video>, and their voice would
 * disappear with it. So audio gets its own hidden <audio> element per peer,
 * independent of whatever the tile is showing.
 *
 * Also handles the browser autoplay policy — Chrome and Safari refuse to play
 * inbound audio until the page has seen a user gesture, which is why a call can
 * look connected but be silent. We detect that and offer a one-tap unblock.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { Room } from 'livekit-client';

interface RemoteAudioSinkProps {
    streams: Record<string, MediaStream>;
    room: Room | null;
    /** Output device id from a speaker picker, if the app has one. */
    sinkId?: string;
}

const RemoteAudioSink: React.FC<RemoteAudioSinkProps> = ({ streams, room, sinkId }) => {
    const elements = useRef<Record<string, HTMLAudioElement | null>>({});
    const [audioBlocked, setAudioBlocked] = useState(false);

    // Watch whether the browser is letting us play inbound audio at all.
    useEffect(() => {
        if (!room) return;
        const update = () => setAudioBlocked(!room.canPlaybackAudio);
        update();
        room.on('audioPlaybackChanged', update);
        return () => {
            room.off('audioPlaybackChanged', update);
        };
    }, [room]);

    // Attach streams and (re)start playback whenever the peer set changes.
    useEffect(() => {
        Object.entries(streams).forEach(([userId, stream]) => {
            const el = elements.current[userId];
            if (!el) return;
            if (el.srcObject !== stream) {
                el.srcObject = stream;
            }
            el.play().catch(() => setAudioBlocked(true));
        });
    }, [streams]);

    // Route to a chosen output device where the browser supports it.
    useEffect(() => {
        if (!sinkId) return;
        Object.values(elements.current).forEach((el) => {
            const withSink = el as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
            withSink?.setSinkId?.(sinkId).catch(() => undefined);
        });
    }, [sinkId, streams]);

    const unblock = async () => {
        try {
            await room?.startAudio();
            await Promise.all(
                Object.values(elements.current).map((el) => el?.play().catch(() => undefined)),
            );
            setAudioBlocked(false);
        } catch {
            /* leave the prompt up so the user can try again */
        }
    };

    return (
        <>
            {Object.keys(streams).map((userId) => (
                <audio
                    key={userId}
                    ref={(el) => {
                        elements.current[userId] = el;
                    }}
                    autoPlay
                    playsInline
                    // Never muted: this element exists purely to make the call audible.
                />
            ))}

            {audioBlocked && (
                <button
                    onClick={unblock}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
                               rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white
                               shadow-lg hover:bg-blue-700"
                >
                    <Volume2 size={16} />
                    Tap to enable meeting audio
                </button>
            )}
        </>
    );
};

export default RemoteAudioSink;
