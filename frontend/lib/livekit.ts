import { API_URL } from "@/lib/config"
/**
 * LiveKit call engine.
 *
 * Everything that carries real audio/video between participants lives here.
 * The Socket.IO server decides *who may enter* (the lobby); LiveKit carries the
 * media once they are in.
 *
 * The rest of the app talks to this through `useLiveKitCall`, which exposes a
 * plain `Record<userId, MediaStream>` so the existing VideoGrid only has to
 * assign `srcObject` — no LiveKit types leak into the UI components.
 */
import {
    Room,
    RoomEvent,
    Track,
    ConnectionQuality,
    VideoPresets,
    type RemoteTrack,
    type RemoteParticipant,
    type LocalParticipant,
    type RoomOptions,
    type RoomConnectOptions,
} from 'livekit-client';

export type RemoteStreamMap = Record<string, MediaStream>;

export interface LiveKitPeer {
    userId: string;
    identity: string;
    name: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    isSpeaking: boolean;
    /** Matches the app's existing Participant union. */
    connectionQuality: 'good' | 'average' | 'poor';
}

const API_BASE = API_URL;

/** LiveKit identities are minted server-side as `user-<id>`. */
export function userIdFromIdentity(identity: string): string {
    return identity.startsWith('user-') ? identity.slice('user-'.length) : identity;
}

export interface LiveKitTokenResponse {
    url: string;
    token: string;
    identity: string;
    room: string;
    is_host: boolean;
}

/**
 * Ask the backend for a join token. Returns null when the host has not admitted
 * this user yet (403) or the server has no LiveKit credentials (503) — both are
 * expected states, not crashes.
 */
export async function fetchLiveKitToken(
    meetingId: string,
): Promise<{ data: LiveKitTokenResponse | null; reason?: string; status: number }> {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!authToken) return { data: null, reason: 'Not signed in', status: 401 };

    const res = await fetch(`${API_BASE}/api/meeting-rooms/${meetingId}/livekit-token`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        let reason = `Request failed (${res.status})`;
        try {
            const body = await res.json();
            reason = body?.error || body?.detail?.error || reason;
        } catch {
            /* non-JSON error body — keep the generic reason */
        }
        return { data: null, reason, status: res.status };
    }

    return { data: (await res.json()) as LiveKitTokenResponse, status: 200 };
}

/**
 * Room tuning.
 *
 * `adaptiveStream` drops resolution for tiles that are small or off-screen and
 * `dynacast` stops publishing layers nobody is watching — together these are
 * what keep the call smooth on a weak connection instead of freezing. Simulcast
 * publishes three quality layers so each viewer gets what their link can take.
 */
export function buildRoomOptions(): RoomOptions {
    return {
        adaptiveStream: true,
        dynacast: true,
        stopLocalTrackOnUnpublish: true,
        videoCaptureDefaults: {
            resolution: VideoPresets.h720.resolution,
        },
        audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        },
        publishDefaults: {
            simulcast: true,
            videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360, VideoPresets.h720],
            videoCodec: 'vp8',
            dtx: true,       // stop sending audio packets during silence
            red: true,       // redundant audio encoding — survives packet loss
        },
    };
}

export function buildConnectOptions(): RoomConnectOptions {
    return {
        autoSubscribe: true,
        // Give the ICE negotiation room to fall back to TURN on hostile networks
        // (mobile carriers, university wifi) instead of failing the join.
        peerConnectionTimeout: 20_000,
    };
}

function qualityLabel(q: ConnectionQuality): LiveKitPeer['connectionQuality'] {
    if (q === ConnectionQuality.Excellent) return 'good';
    if (q === ConnectionQuality.Good) return 'average';
    if (q === ConnectionQuality.Poor || q === ConnectionQuality.Lost) return 'poor';
    return 'good';   // Unknown — do not flag a warning we cannot substantiate
}

/** Snapshot a remote participant into the plain shape the UI understands. */
export function describePeer(p: RemoteParticipant | LocalParticipant): LiveKitPeer {
    const camPub = p.getTrackPublication(Track.Source.Camera);
    const micPub = p.getTrackPublication(Track.Source.ScreenShare);
    const audioPub = p.getTrackPublication(Track.Source.Microphone);
    const screenPub = p.getTrackPublication(Track.Source.ScreenShare);

    return {
        userId: userIdFromIdentity(p.identity),
        identity: p.identity,
        name: p.name || p.identity,
        isAudioEnabled: !!audioPub && !audioPub.isMuted,
        isVideoEnabled: !!camPub && !camPub.isMuted,
        isScreenSharing: !!screenPub && !screenPub.isMuted,
        isSpeaking: p.isSpeaking,
        connectionQuality: qualityLabel(p.connectionQuality),
    };
}

export { Room, RoomEvent, Track };
export type { RemoteTrack, RemoteParticipant };
