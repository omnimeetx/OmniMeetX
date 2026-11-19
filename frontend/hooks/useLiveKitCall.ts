'use client';

/**
 * useLiveKitCall — connects the meeting page to the LiveKit SFU.
 *
 * Responsibilities:
 *   - fetch a join token (only granted once the host has admitted you)
 *   - publish camera + mic, and keep them in sync with the UI toggles
 *   - expose remote participants' media as `Record<userId, MediaStream>`
 *   - surface speaking/quality state for the tiles
 *
 * It deliberately returns plain browser types so VideoGrid and friends never
 * need to know LiveKit exists.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    Room,
    RoomEvent,
    Track,
    buildConnectOptions,
    buildRoomOptions,
    describePeer,
    fetchLiveKitToken,
    userIdFromIdentity,
    type LiveKitPeer,
    type RemoteStreamMap,
} from '@/lib/livekit';
import type {
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    Participant,
} from 'livekit-client';

export type CallStatus =
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'waiting'      // host has not admitted us yet
    | 'unavailable'  // LiveKit not configured on the server
    | 'error';

interface UseLiveKitCallOptions {
    meetingId: string;
    /** Only attempt to connect once the lobby has admitted us. */
    enabled: boolean;
    initialAudioEnabled?: boolean;
    initialVideoEnabled?: boolean;
}

export interface UseLiveKitCallResult {
    status: CallStatus;
    error: string | null;
    room: Room | null;
    /** userId -> MediaStream containing that peer's camera (and mic) tracks. */
    remoteStreams: RemoteStreamMap;
    /** userId -> MediaStream carrying a screen share, when present. */
    screenStreams: RemoteStreamMap;
    /** Live per-peer flags (muted, speaking, connection quality). */
    peers: Record<string, LiveKitPeer>;
    localStream: MediaStream | null;
    activeSpeakerId: string | null;
    setMicEnabled: (on: boolean) => Promise<void>;
    setCameraEnabled: (on: boolean) => Promise<void>;
    startScreenShare: () => Promise<boolean>;
    stopScreenShare: () => Promise<void>;
    disconnect: () => Promise<void>;
    retry: () => void;
}

export function useLiveKitCall({
    meetingId,
    enabled,
    initialAudioEnabled = true,
    initialVideoEnabled = true,
}: UseLiveKitCallOptions): UseLiveKitCallResult {
    const roomRef = useRef<Room | null>(null);
    const [room, setRoom] = useState<Room | null>(null);
    const [status, setStatus] = useState<CallStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<RemoteStreamMap>({});
    const [screenStreams, setScreenStreams] = useState<RemoteStreamMap>({});
    const [peers, setPeers] = useState<Record<string, LiveKitPeer>>({});
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    const retry = useCallback(() => setAttempt((n) => n + 1), []);

    /** Rebuild the peer flag map from whatever LiveKit currently knows. */
    const syncPeers = useCallback(() => {
        const r = roomRef.current;
        if (!r) return;
        const next: Record<string, LiveKitPeer> = {};
        r.remoteParticipants.forEach((p) => {
            next[userIdFromIdentity(p.identity)] = describePeer(p);
        });
        setPeers(next);
    }, []);

    const attachTrack = useCallback(
        (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            const userId = userIdFromIdentity(participant.identity);
            const isScreen =
                publication.source === Track.Source.ScreenShare ||
                publication.source === Track.Source.ScreenShareAudio;
            const setter = isScreen ? setScreenStreams : setRemoteStreams;

            setter((prev) => {
                // Keep one MediaStream per peer and add tracks into it, so a tile
                // that already has video does not flicker when audio arrives.
                const existing = prev[userId];
                const stream = existing ?? new MediaStream();
                if (!stream.getTracks().includes(track.mediaStreamTrack)) {
                    stream.addTrack(track.mediaStreamTrack);
                }
                return { ...prev, [userId]: stream };
            });
            syncPeers();
        },
        [syncPeers],
    );

    const detachTrack = useCallback(
        (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            const userId = userIdFromIdentity(participant.identity);
            const isScreen =
                publication.source === Track.Source.ScreenShare ||
                publication.source === Track.Source.ScreenShareAudio;
            const setter = isScreen ? setScreenStreams : setRemoteStreams;

            setter((prev) => {
                const stream = prev[userId];
                if (!stream) return prev;
                try {
                    stream.removeTrack(track.mediaStreamTrack);
                } catch {
                    /* track already gone */
                }
                if (stream.getTracks().length === 0) {
                    const { [userId]: _dropped, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [userId]: stream };
            });
            syncPeers();
        },
        [syncPeers],
    );

    // ---- connect / teardown -------------------------------------------------
    useEffect(() => {
        if (!enabled || !meetingId) return;

        let cancelled = false;
        const r = new Room(buildRoomOptions());

        const onSpeakers = (speakers: Participant[]) => {
            const loudest = speakers[0];
            setActiveSpeakerId(loudest ? userIdFromIdentity(loudest.identity) : null);
            syncPeers();
        };

        const onParticipantGone = (p: RemoteParticipant) => {
            const userId = userIdFromIdentity(p.identity);
            const drop = (prev: RemoteStreamMap) => {
                const { [userId]: _gone, ...rest } = prev;
                return rest;
            };
            setRemoteStreams(drop);
            setScreenStreams(drop);
            syncPeers();
        };

        r.on(RoomEvent.TrackSubscribed, attachTrack)
            .on(RoomEvent.TrackUnsubscribed, detachTrack)
            .on(RoomEvent.ParticipantConnected, syncPeers)
            .on(RoomEvent.ParticipantDisconnected, onParticipantGone)
            .on(RoomEvent.TrackMuted, syncPeers)
            .on(RoomEvent.TrackUnmuted, syncPeers)
            .on(RoomEvent.ConnectionQualityChanged, syncPeers)
            .on(RoomEvent.ActiveSpeakersChanged, onSpeakers)
            .on(RoomEvent.Disconnected, () => {
                if (!cancelled) setStatus('idle');
            })
            .on(RoomEvent.Reconnecting, () => {
                if (!cancelled) toast('Connection dropped — reconnecting...', { icon: '📶' });
            })
            .on(RoomEvent.Reconnected, () => {
                if (!cancelled) {
                    toast.success('Reconnected');
                    syncPeers();
                }
            });

        (async () => {
            setStatus('connecting');
            setError(null);

            const { data, reason, status: httpStatus } = await fetchLiveKitToken(meetingId);
            if (cancelled) return;

            if (!data) {
                if (httpStatus === 403) {
                    setStatus('waiting');
                } else if (httpStatus === 503) {
                    setStatus('unavailable');
                    setError(reason || 'Video calling is not configured on the server');
                } else {
                    setStatus('error');
                    setError(reason || 'Could not join the call');
                }
                return;
            }

            try {
                await r.connect(data.url, data.token, buildConnectOptions());
                if (cancelled) {
                    await r.disconnect();
                    return;
                }

                // getUserMedia needs a secure context; this is the usual failure
                // on a plain-http deployment, so say so plainly.
                await r.localParticipant.setMicrophoneEnabled(initialAudioEnabled);
                await r.localParticipant.setCameraEnabled(initialVideoEnabled);

                const camPub = r.localParticipant.getTrackPublication(Track.Source.Camera);
                const micPub = r.localParticipant.getTrackPublication(Track.Source.Microphone);
                const ms = new MediaStream();
                if (camPub?.track) ms.addTrack(camPub.track.mediaStreamTrack);
                if (micPub?.track) ms.addTrack(micPub.track.mediaStreamTrack);

                roomRef.current = r;
                setRoom(r);
                setLocalStream(ms);
                setStatus('connected');
                syncPeers();
            } catch (e: any) {
                if (cancelled) return;
                const insecure =
                    typeof window !== 'undefined' &&
                    !window.isSecureContext &&
                    window.location.hostname !== 'localhost';
                setStatus('error');
                setError(
                    insecure
                        ? 'Camera and microphone need HTTPS. Open this meeting over https:// and try again.'
                        : e?.message || 'Could not connect to the call',
                );
            }
        })();

        return () => {
            cancelled = true;
            r.removeAllListeners();
            r.disconnect().catch(() => undefined);
            roomRef.current = null;
            setRoom(null);
            setRemoteStreams({});
            setScreenStreams({});
            setPeers({});
            setLocalStream(null);
        };
    }, [meetingId, enabled, attempt, attachTrack, detachTrack, syncPeers,
        initialAudioEnabled, initialVideoEnabled]);

    // ---- controls -----------------------------------------------------------
    const setMicEnabled = useCallback(async (on: boolean) => {
        const r = roomRef.current;
        if (!r) return;
        await r.localParticipant.setMicrophoneEnabled(on);
    }, []);

    const setCameraEnabled = useCallback(async (on: boolean) => {
        const r = roomRef.current;
        if (!r) return;
        await r.localParticipant.setCameraEnabled(on);

        const pub = r.localParticipant.getTrackPublication(Track.Source.Camera);
        setLocalStream((prev) => {
            const ms = prev ?? new MediaStream();
            ms.getVideoTracks().forEach((t) => ms.removeTrack(t));
            if (on && pub?.track) ms.addTrack(pub.track.mediaStreamTrack);
            return ms;
        });
    }, []);

    const startScreenShare = useCallback(async () => {
        const r = roomRef.current;
        if (!r) return false;
        try {
            await r.localParticipant.setScreenShareEnabled(true, { audio: true });
            return true;
        } catch {
            // User dismissed the picker — not an error worth shouting about.
            return false;
        }
    }, []);

    const stopScreenShare = useCallback(async () => {
        const r = roomRef.current;
        if (!r) return;
        await r.localParticipant.setScreenShareEnabled(false);
    }, []);

    const disconnect = useCallback(async () => {
        const r = roomRef.current;
        if (!r) return;
        await r.disconnect();
        roomRef.current = null;
        setRoom(null);
        setStatus('idle');
    }, []);

    return {
        status,
        error,
        room,
        remoteStreams,
        screenStreams,
        peers,
        localStream,
        activeSpeakerId,
        setMicEnabled,
        setCameraEnabled,
        startScreenShare,
        stopScreenShare,
        disconnect,
        retry,
    };
}
