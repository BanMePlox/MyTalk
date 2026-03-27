/**
 * VoiceContext — isolated voice service layer.
 *
 * All WebRTC signaling, peer management and presence logic lives here.
 * If this is ever extracted to a microservice, only this file changes;
 * consumers (VoiceChannel, VoiceMiniBar, Show sidebar) stay the same.
 *
 * Public interface:
 *   activeChannel         – channel object currently in use, or null
 *   joined                – boolean
 *   muted / deafened      – boolean
 *   micVolume             – 0-200
 *   participants          – { [userId]: { id, name, avatar_url } }
 *   userVolumes           – { [userId]: 0-100 }
 *   join(channel, authUser)
 *   leave()
 *   toggleMute()
 *   toggleDeafen()
 *   changeMicVolume(val)
 *   changeUserVolume(userId, val)
 */

import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
    const [activeChannel, setActiveChannel] = useState(null);
    const [joined,        setJoined]        = useState(false);
    const [muted,         setMuted]         = useState(false);
    const [deafened,      setDeafened]      = useState(false);
    const [micVolume,     setMicVolume]     = useState(100);
    const [participants,  setParticipants]  = useState({});
    const [userVolumes,   setUserVolumes]   = useState({});

    // Stable refs — survive re-renders and navigation
    const localStreamRef = useRef(null);
    const gainNodeRef    = useRef(null);
    const peersRef       = useRef({});
    const audioElemsRef  = useRef({});
    const echoChannelRef = useRef(null);
    const joinedRef      = useRef(false);
    const authUserRef    = useRef(null);
    const csrfTokenRef   = useRef(document.querySelector('meta[name="csrf-token"]')?.content ?? '');

    // ── Helpers ──────────────────────────────────────────────────────────────

    const encodeSdp = (sdp) => btoa(unescape(encodeURIComponent(sdp)));
    const decodeSdp = (b64) => decodeURIComponent(escape(atob(b64)));

    function sendSignal(channelId, toUserId, data) {
        window.axios.post(route('voice.signal', channelId), {
            to_user_id: toUserId,
            ...data,
        }).catch(console.error);
    }

    function createPeer(channelId, userId) {
        if (peersRef.current[userId]) return peersRef.current[userId];

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pc._icePending = [];

        localStreamRef.current?.getTracks().forEach(track =>
            pc.addTrack(track, localStreamRef.current)
        );

        pc.onicecandidate = ({ candidate }) => {
            if (candidate) sendSignal(channelId, userId, { type: 'ice', candidate: candidate.toJSON() });
        };

        pc.ontrack = ({ streams, track }) => {
            let audio = audioElemsRef.current[userId];
            if (!audio) {
                audio = document.createElement('audio');
                audio.autoplay = true;
                audio.style.display = 'none';
                document.body.appendChild(audio);
                audioElemsRef.current[userId] = audio;
            }
            const stream = streams?.[0] ?? new MediaStream([track]);
            audio.srcObject = stream;
            audio.volume = Math.min((userVolumes[userId] ?? 100) / 100, 1);
            audio.play().catch(err => console.warn('[Voice] Audio play blocked:', err));
        };

        peersRef.current[userId] = pc;
        return pc;
    }

    function closePeer(userId) {
        peersRef.current[userId]?.close();
        delete peersRef.current[userId];
        if (audioElemsRef.current[userId]) {
            audioElemsRef.current[userId].srcObject = null;
            audioElemsRef.current[userId].remove();
            delete audioElemsRef.current[userId];
        }
    }

    async function createOffer(channelId, userId) {
        const pc = createPeer(channelId, userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(channelId, userId, { type: 'offer', sdp: encodeSdp(offer.sdp) });
    }

    async function handleOffer(channelId, fromUserId, sdp) {
        const pc = createPeer(channelId, fromUserId);
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: decodeSdp(sdp) }));
        for (const c of pc._icePending) {
            try { await pc.addIceCandidate(c); } catch {}
        }
        pc._icePending = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(channelId, fromUserId, { type: 'answer', sdp: encodeSdp(answer.sdp) });
    }

    async function handleAnswer(fromUserId, sdp) {
        const pc = peersRef.current[fromUserId];
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: decodeSdp(sdp) }));
        for (const c of pc._icePending) {
            try { await pc.addIceCandidate(c); } catch {}
        }
        pc._icePending = [];
    }

    async function handleIce(fromUserId, candidate) {
        const pc = peersRef.current[fromUserId];
        if (!pc || !candidate) return;
        if (pc.remoteDescription) {
            try { await pc.addIceCandidate(candidate); } catch {}
        } else {
            pc._icePending.push(candidate);
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    const join = useCallback(async (channel, authUser) => {
        if (joinedRef.current) return; // already in a call

        let localStream;
        try {
            const rawStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            const audioCtx  = new AudioContext();
            const source    = audioCtx.createMediaStreamSource(rawStream);
            const gainNode  = audioCtx.createGain();
            gainNode.gain.value = micVolume / 100;
            const dest = audioCtx.createMediaStreamDestination();
            source.connect(gainNode);
            gainNode.connect(dest);
            gainNodeRef.current    = gainNode;
            localStream            = dest.stream;
            localStream._rawStream = rawStream;
            localStreamRef.current = localStream;
        } catch (e) {
            alert('No se pudo acceder al micrófono: ' + e.message);
            return;
        }

        authUserRef.current = authUser;
        joinedRef.current   = true;
        window.axios.defaults.headers.common['X-Voice-Channel-Id'] = channel.id;
        setJoined(true);
        setActiveChannel(channel);

        window.axios.post(route('voice.presence', channel.id), { action: 'join' }).catch(console.error);

        echoChannelRef.current = window.Echo.join(`presence-voice.${channel.id}`)
            .here(users => {
                const map = {};
                users.forEach(u => { map[u.id] = u; });
                setParticipants(map);
                users.forEach(u => {
                    if (u.id !== authUser.id) createOffer(channel.id, u.id);
                });
            })
            .joining(user => {
                setParticipants(prev => ({ ...prev, [user.id]: user }));
            })
            .leaving(user => {
                setParticipants(prev => {
                    const next = { ...prev };
                    delete next[user.id];
                    return next;
                });
                closePeer(user.id);
            });

        window.Echo.private(`App.Models.User.${authUser.id}`)
            .listen('.VoiceSignal', async ({ type, sdp, candidate, from_user_id, channel_id }) => {
                if (parseInt(channel_id) !== parseInt(channel.id)) return;
                if (type === 'offer')  await handleOffer(channel.id, from_user_id, sdp);
                if (type === 'answer') await handleAnswer(from_user_id, sdp);
                if (type === 'ice')    await handleIce(from_user_id, candidate);
            });
    }, [micVolume]);

    const leave = useCallback(() => {
        const channel  = activeChannel;
        const authUser = authUserRef.current;
        if (!joinedRef.current || !channel) return;

        Object.keys(peersRef.current).forEach(closePeer);
        localStreamRef.current?._rawStream?.getTracks().forEach(t => t.stop());
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        gainNodeRef.current    = null;

        window.Echo.leave(`presence-voice.${channel.id}`);
        if (authUser) {
            window.Echo.private(`App.Models.User.${authUser.id}`).stopListening('.VoiceSignal');
        }
        echoChannelRef.current = null;
        joinedRef.current      = false;
        delete window.axios.defaults.headers.common['X-Voice-Channel-Id'];

        setJoined(false);
        setMuted(false);
        setDeafened(false);
        setParticipants({});
        setActiveChannel(null);

        // Use axios for explicit leave (button click) — reliable and includes CSRF automatically.
        // keepalive fetch is registered separately via beforeunload for the browser-close case.
        window.axios.post(route('voice.presence', channel.id), { action: 'leave' }).catch(() => {});
    }, [activeChannel]);

    const toggleMute = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = muted;
            setMuted(m => !m);
        }
    }, [muted]);

    const toggleDeafen = useCallback(() => {
        const next = !deafened;
        Object.values(audioElemsRef.current).forEach(el => { el.muted = next; });
        setDeafened(next);
    }, [deafened]);

    const changeMicVolume = useCallback((val) => {
        const v = Number(val);
        setMicVolume(v);
        if (gainNodeRef.current) gainNodeRef.current.gain.value = v / 100;
    }, []);

    const changeUserVolume = useCallback((userId, val) => {
        const v = Number(val);
        setUserVolumes(prev => ({ ...prev, [userId]: v }));
        const audio = audioElemsRef.current[userId];
        if (audio) audio.volume = Math.min(v / 100, 1);
    }, []);

    // Sync participant leave from external VoicePresenceChanged broadcast
    const syncExternalPresence = useCallback((e) => {
        if (!joinedRef.current || !activeChannel) return;
        if (parseInt(e.channel_id) !== parseInt(activeChannel.id)) return;
        if (e.action === 'leave') {
            setParticipants(prev => {
                const next = { ...prev };
                delete next[e.user.id];
                return next;
            });
            closePeer(e.user.id);
        } else if (e.action === 'join') {
            setParticipants(prev => ({ ...prev, [e.user.id]: e.user }));
        }
    }, [activeChannel]);

    // Browser close/refresh while in call — use keepalive fetch as last resort
    useEffect(() => {
        const handleUnload = () => {
            if (!joinedRef.current || !activeChannel) return;
            fetch(route('voice.presence', activeChannel.id), {
                method: 'POST',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfTokenRef.current,
                },
                body: JSON.stringify({ action: 'leave' }),
            });
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [activeChannel]);

    const value = {
        activeChannel,
        joined,
        muted,
        deafened,
        micVolume,
        participants,
        userVolumes,
        join,
        leave,
        toggleMute,
        toggleDeafen,
        changeMicVolume,
        changeUserVolume,
        syncExternalPresence,
    };

    return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
    const ctx = useContext(VoiceContext);
    if (!ctx) throw new Error('useVoice must be used inside VoiceProvider');
    return ctx;
}
