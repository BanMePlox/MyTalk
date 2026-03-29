/**
 * VoiceContext — isolated voice service layer.
 *
 * Handles both server voice channels and DM voice/video calls.
 *
 * Public interface:
 *   activeChannel         – channel object when in server call, or null
 *   activeConversation    – conversation object when in DM call, or null
 *   joined                – boolean
 *   muted / deafened      – boolean
 *   micVolume             – 0-200
 *   participants          – { [userId]: { id, name, avatar_url } }
 *   userVolumes           – { [userId]: 0-100 }
 *   speakingUsers         – { [userId]: boolean }
 *   incomingCall          – { conversationId, fromUser } or null
 *   dmCallStatus          – 'idle' | 'calling' | 'active' | 'declined'
 *   join(channel, authUser)
 *   joinDm(conversation, authUser)
 *   callDm(conversation, authUser)
 *   declineDmCall(conversationId)
 *   leave()
 *   toggleMute / toggleDeafen / changeMicVolume / changeUserVolume
 *   startScreenShare / stopScreenShare / toggleSystemAudio
 */

import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { usePage } from '@inertiajs/react';

// Inner provider that has access to Inertia page context
function VoiceProviderInner({ children }) {
    const { auth } = usePage().props;
    return <VoiceProviderCore auth={auth}>{children}</VoiceProviderCore>;
}

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

const SPEAKING_THRESHOLD = 10;

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
    return <VoiceProviderInner>{children}</VoiceProviderInner>;
}

function VoiceProviderCore({ auth, children }) {

    const [activeChannel,      setActiveChannel]      = useState(null);
    const [activeConversation, setActiveConversation] = useState(null);
    const [joined,             setJoined]             = useState(false);
    const [muted,              setMuted]              = useState(false);
    const [deafened,           setDeafened]           = useState(false);
    const [micVolume,          setMicVolume]          = useState(100);
    const [participants,       setParticipants]       = useState({});
    const [userVolumes,        setUserVolumes]        = useState({});
    const [speakingUsers,      setSpeakingUsers]      = useState({});
    const [sharingScreen,      setSharingScreen]      = useState(false);
    const [localScreenStream,  setLocalScreenStream]  = useState(null);
    const [remoteScreens,      setRemoteScreens]      = useState({});
    const [systemAudioEnabled, setSystemAudioEnabled] = useState(false);
    const [hasSystemAudio,     setHasSystemAudio]     = useState(false);
    const [incomingCall,       setIncomingCall]       = useState(null); // { conversationId, fromUser }
    const [dmCallStatus,       setDmCallStatus]       = useState('idle'); // idle|calling|active|declined

    // Stable refs
    const localStreamRef       = useRef(null);
    const gainNodeRef          = useRef(null);
    const peersRef             = useRef({});
    const audioElemsRef        = useRef({});
    const echoChannelRef       = useRef(null);
    const joinedRef            = useRef(false);
    const authUserRef          = useRef(null);
    const csrfTokenRef         = useRef(document.querySelector('meta[name="csrf-token"]')?.content ?? '');
    const dmConvIdRef          = useRef(null); // non-null when in a DM call

    // Speaking detection
    const audioCtxRef        = useRef(null);
    const localAnalyserRef   = useRef(null);
    const remoteAnalysersRef = useRef({});
    const remoteGainsRef     = useRef({});
    const animFrameRef       = useRef(null);

    // Screen sharing
    const screenStreamRef     = useRef(null);
    const screenSendersRef    = useRef({});
    const screenAudioTrackRef = useRef(null);
    const sysAudioSendersRef  = useRef({});

    // Always-fresh mirrors to avoid stale closures in rAF / callbacks
    const mutedRef              = useRef(false);
    const deafenedRef           = useRef(false);
    const userVolumesRef        = useRef({});
    const activeChannelRef      = useRef(null);
    const activeConversationRef = useRef(null);
    userVolumesRef.current        = userVolumes;
    activeChannelRef.current      = activeChannel;
    activeConversationRef.current = activeConversation;

    // ── Speaking detection loop ───────────────────────────────────────────────

    function startSpeakingLoop() {
        const data = new Uint8Array(32);
        const prev = {};

        const tick = () => {
            const next = {};

            if (localAnalyserRef.current && authUserRef.current) {
                localAnalyserRef.current.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                next[String(authUserRef.current.id)] = !mutedRef.current && avg > SPEAKING_THRESHOLD;
            }

            Object.entries(remoteAnalysersRef.current).forEach(([uid, analyser]) => {
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                next[String(uid)] = avg > SPEAKING_THRESHOLD;
            });

            const changed =
                Object.keys(next).some(k => Boolean(next[k]) !== Boolean(prev[k])) ||
                Object.keys(prev).some(k => !(k in next));

            if (changed) {
                Object.keys(prev).forEach(k => delete prev[k]);
                Object.assign(prev, next);
                setSpeakingUsers({ ...next });
            }

            animFrameRef.current = requestAnimationFrame(tick);
        };

        animFrameRef.current = requestAnimationFrame(tick);
    }

    function stopSpeakingLoop() {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        localAnalyserRef.current   = null;
        remoteAnalysersRef.current = {};
        remoteGainsRef.current     = {};
        if (audioCtxRef.current) {
            audioCtxRef.current.close().catch(() => {});
            audioCtxRef.current = null;
        }
        setSpeakingUsers({});
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    const encodeSdp = (sdp) => btoa(unescape(encodeURIComponent(sdp)));
    const decodeSdp = (b64) => decodeURIComponent(escape(atob(b64)));

    // Routes to the correct signal endpoint depending on call type
    function sendSignal(channelId, toUserId, data) {
        const url = dmConvIdRef.current
            ? route('voice.conversation.signal', dmConvIdRef.current)
            : route('voice.signal', channelId);
        window.axios.post(url, { to_user_id: toUserId, ...data }).catch(console.error);
    }

    // ── Renegotiation ────────────────────────────────────────────────────────

    async function renegotiate(userId) {
        const pc        = peersRef.current[userId];
        const channelId = activeChannelRef.current?.id;
        if (!pc || (!channelId && !dmConvIdRef.current)) return;
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal(channelId, userId, { type: 'offer', sdp: encodeSdp(offer.sdp) });
        } catch (e) {
            console.warn('[Voice] Renegotiation failed for', userId, e);
        }
    }

    // ── Peer management ───────────────────────────────────────────────────────

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
            const stream = streams?.[0] ?? new MediaStream([track]);

            if (track.kind === 'video') {
                setRemoteScreens(prev => ({ ...prev, [userId]: stream }));
                track.addEventListener('ended', () => {
                    setRemoteScreens(prev => {
                        const next = { ...prev };
                        delete next[userId];
                        return next;
                    });
                });
                return;
            }

            const isSysAudio = !!audioElemsRef.current[userId];
            const audioKey   = isSysAudio ? `${userId}_sys` : userId;

            let audio = audioElemsRef.current[audioKey];
            if (!audio) {
                audio = document.createElement('audio');
                audio.muted = true;
                audio.style.display = 'none';
                document.body.appendChild(audio);
                audioElemsRef.current[audioKey] = audio;
            }
            audio.srcObject = stream;
            audio.play().catch(() => {});

            if (audioCtxRef.current && !remoteGainsRef.current[audioKey]) {
                const ctx      = audioCtxRef.current;
                const mediaSrc = ctx.createMediaStreamSource(stream);
                const gainNode = ctx.createGain();
                const vol = Math.min((userVolumesRef.current[userId] ?? 100) / 100, 1);
                gainNode.gain.value = deafenedRef.current ? 0 : vol;

                mediaSrc.connect(gainNode);
                gainNode.connect(ctx.destination);

                if (!isSysAudio) {
                    const analyser   = ctx.createAnalyser();
                    analyser.fftSize = 64;
                    mediaSrc.connect(analyser);
                    remoteAnalysersRef.current[userId] = analyser;
                }

                remoteGainsRef.current[audioKey] = gainNode;
            }
        };

        peersRef.current[userId] = pc;
        return pc;
    }

    function closePeer(userId) {
        peersRef.current[userId]?.close();
        delete peersRef.current[userId];
        delete screenSendersRef.current[userId];
        delete sysAudioSendersRef.current[userId];
        [`${userId}`, `${userId}_sys`].forEach(key => {
            if (audioElemsRef.current[key]) {
                audioElemsRef.current[key].srcObject = null;
                audioElemsRef.current[key].remove();
                delete audioElemsRef.current[key];
            }
            delete remoteGainsRef.current[key];
        });
        delete remoteAnalysersRef.current[userId];
        setRemoteScreens(prev => {
            if (!(userId in prev)) return prev;
            const next = { ...prev };
            delete next[userId];
            return next;
        });
    }

    async function createOffer(channelId, userId) {
        const pc = createPeer(channelId, userId);
        if (screenStreamRef.current && !screenSendersRef.current[userId]) {
            const videoTrack = screenStreamRef.current.getVideoTracks()[0];
            const audioTrack = screenAudioTrackRef.current;
            if (videoTrack) {
                try { screenSendersRef.current[userId] = pc.addTrack(videoTrack, screenStreamRef.current); } catch (e) {}
            }
            if (audioTrack) {
                try { sysAudioSendersRef.current[userId] = pc.addTrack(audioTrack, screenStreamRef.current); } catch (e) {}
            }
        }
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

    // ── Shared signal dispatcher ──────────────────────────────────────────────

    async function handleVoiceSignal(payload, contextId) {
        const { type, sdp, candidate, from_user_id } = payload;

        if (type === 'offer') {
            await handleOffer(contextId, from_user_id, sdp);
            if (screenStreamRef.current) {
                const videoTrack = screenStreamRef.current.getVideoTracks()[0];
                const pc = peersRef.current[from_user_id];
                if (videoTrack && pc && !screenSendersRef.current[from_user_id]) {
                    try {
                        screenSendersRef.current[from_user_id] = pc.addTrack(videoTrack, screenStreamRef.current);
                        const audioTrack = screenAudioTrackRef.current;
                        if (audioTrack) {
                            sysAudioSendersRef.current[from_user_id] = pc.addTrack(audioTrack, screenStreamRef.current);
                        }
                        await renegotiate(from_user_id);
                    } catch (e) {}
                }
            }
        }
        if (type === 'answer') await handleAnswer(from_user_id, sdp);
        if (type === 'ice')    await handleIce(from_user_id, candidate);
        if (type === 'screen-share-stop') {
            setRemoteScreens(prev => { const n = { ...prev }; delete n[from_user_id]; return n; });
        }
        if (type === 'screen-share-start') {
            const pc = peersRef.current[from_user_id];
            if (pc) {
                const receiver = pc.getReceivers().find(r => r.track.kind === 'video');
                if (receiver) {
                    setRemoteScreens(prev => ({ ...prev, [from_user_id]: new MediaStream([receiver.track]) }));
                }
            }
        }
    }

    // ── Shared mic setup ──────────────────────────────────────────────────────

    async function setupMic(currentMicVolume) {
        const rawStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioCtxRef.current = new AudioContext();
        const audioCtx  = audioCtxRef.current;
        const source    = audioCtx.createMediaStreamSource(rawStream);
        const gainNode  = audioCtx.createGain();
        gainNode.gain.value = currentMicVolume / 100;
        const dest = audioCtx.createMediaStreamDestination();

        const localAnalyser   = audioCtx.createAnalyser();
        localAnalyser.fftSize = 64;
        source.connect(localAnalyser);
        source.connect(gainNode);
        gainNode.connect(dest);

        gainNodeRef.current      = gainNode;
        localAnalyserRef.current = localAnalyser;
        const localStream        = dest.stream;
        localStream._rawStream   = rawStream;
        localStreamRef.current   = localStream;
    }

    // ── Shared cleanup ────────────────────────────────────────────────────────

    function cleanupMedia() {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current     = null;
            screenAudioTrackRef.current = null;
            screenSendersRef.current    = {};
            sysAudioSendersRef.current  = {};
            setSharingScreen(false);
            setLocalScreenStream(null);
            setHasSystemAudio(false);
            setSystemAudioEnabled(false);
            setRemoteScreens({});
        }
        Object.keys(peersRef.current).forEach(closePeer);
        localStreamRef.current?._rawStream?.getTracks().forEach(t => t.stop());
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        gainNodeRef.current    = null;
        stopSpeakingLoop();
    }

    // ── Public API ────────────────────────────────────────────────────────────

    const join = useCallback(async (channel, authUser) => {
        if (joinedRef.current) return;

        try {
            await setupMic(micVolume);
        } catch (e) {
            alert('No se pudo acceder al micrófono: ' + e.message);
            return;
        }

        authUserRef.current = authUser;
        joinedRef.current   = true;
        mutedRef.current    = false;
        deafenedRef.current = false;
        dmConvIdRef.current = null;
        window.axios.defaults.headers.common['X-Voice-Channel-Id'] = channel.id;
        setJoined(true);
        setActiveChannel(channel);

        startSpeakingLoop();

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
                setParticipants(prev => { const n = { ...prev }; delete n[user.id]; return n; });
                closePeer(user.id);
            });

        window.Echo.private(`App.Models.User.${authUser.id}`)
            .listen('.VoiceSignal', async (payload) => {
                if (payload.conversation_id) return; // DM signal — ignore
                if (parseInt(payload.channel_id) !== parseInt(channel.id)) return;
                await handleVoiceSignal(payload, channel.id);
            });
    }, [micVolume]);

    // ── DM call API ───────────────────────────────────────────────────────────

    const joinDm = useCallback(async (conversation, authUser) => {
        if (joinedRef.current) return;

        try {
            await setupMic(micVolume);
        } catch (e) {
            alert('No se pudo acceder al micrófono: ' + e.message);
            return;
        }

        authUserRef.current = authUser;
        joinedRef.current   = true;
        mutedRef.current    = false;
        deafenedRef.current = false;
        dmConvIdRef.current = conversation.id;
        setJoined(true);
        setActiveConversation(conversation);
        setIncomingCall(null);

        startSpeakingLoop();

        window.axios.post(route('voice.conversation.presence', conversation.id), { action: 'join' }).catch(console.error);

        echoChannelRef.current = window.Echo.join(`presence-dm-voice.${conversation.id}`)
            .here(users => {
                const map = {};
                users.forEach(u => { map[u.id] = u; });
                setParticipants(map);
                users.forEach(u => {
                    if (u.id !== authUser.id) createOffer(conversation.id, u.id);
                });
            })
            .joining(user => {
                setParticipants(prev => ({ ...prev, [user.id]: user }));
                setDmCallStatus('active');
            })
            .leaving(user => {
                setParticipants(prev => { const n = { ...prev }; delete n[user.id]; return n; });
                closePeer(user.id);
            });

        window.Echo.private(`App.Models.User.${authUser.id}`)
            .listen('.VoiceSignal', async (payload) => {
                if (!payload.conversation_id) return; // channel signal — ignore
                if (parseInt(payload.conversation_id) !== conversation.id) return;
                await handleVoiceSignal(payload, conversation.id);
            });
    }, [micVolume]);

    // Caller initiates: joins presence channel + sends invite to recipient
    const callDm = useCallback(async (conversation, authUser) => {
        if (joinedRef.current) return;
        setDmCallStatus('calling');
        await joinDm(conversation, authUser);
        window.axios.post(route('voice.conversation.invite', conversation.id), { action: 'invite' }).catch(console.error);
    }, [joinDm]);

    // Callee declines
    const declineDmCall = useCallback((conversationId) => {
        setIncomingCall(null);
        window.axios.post(route('voice.conversation.invite', conversationId), { action: 'decline' }).catch(console.error);
    }, []);

    // ── Leave ─────────────────────────────────────────────────────────────────

    const leave = useCallback(() => {
        const channel      = activeChannelRef.current;
        const conversation = activeConversationRef.current;
        const isDm         = !!dmConvIdRef.current;
        const authUser     = authUserRef.current;

        if (!joinedRef.current || (!channel && !conversation)) return;

        cleanupMedia();

        if (authUser) {
            window.Echo.private(`App.Models.User.${authUser.id}`).stopListening('.VoiceSignal');
        }

        if (isDm) {
            const convId = conversation.id;
            window.Echo.leave(`presence-dm-voice.${convId}`);
            window.axios.post(route('voice.conversation.presence', convId), { action: 'leave' }).catch(() => {});
            window.axios.post(route('voice.conversation.invite', convId), { action: 'cancel' }).catch(() => {});
            setActiveConversation(null);
            setDmCallStatus('idle');
        } else {
            window.Echo.leave(`presence-voice.${channel.id}`);
            window.axios.post(route('voice.presence', channel.id), { action: 'leave' }).catch(() => {});
            delete window.axios.defaults.headers.common['X-Voice-Channel-Id'];
            setActiveChannel(null);
        }

        echoChannelRef.current = null;
        dmConvIdRef.current    = null;
        joinedRef.current      = false;
        setJoined(false);
        setMuted(false);
        setDeafened(false);
        setParticipants({});
    }, []);

    // ── Screen sharing ────────────────────────────────────────────────────────

    const stopScreenShare = useCallback(() => {
        if (!screenStreamRef.current) return;
        const stream = screenStreamRef.current;
        screenStreamRef.current     = null;
        screenAudioTrackRef.current = null;
        stream.getTracks().forEach(t => t.stop());

        const channelId = activeChannelRef.current?.id;
        Object.entries(screenSendersRef.current).forEach(([uid, sender]) => {
            sender.replaceTrack(null).catch(() => {});
            if (channelId || dmConvIdRef.current) sendSignal(channelId, uid, { type: 'screen-share-stop' });
        });
        Object.values(sysAudioSendersRef.current).forEach(sender => {
            sender.replaceTrack(null).catch(() => {});
        });
        setSharingScreen(false);
        setLocalScreenStream(null);
        setHasSystemAudio(false);
        setSystemAudioEnabled(false);
    }, []);

    const toggleSystemAudio = useCallback(() => {
        const track = screenAudioTrackRef.current;
        if (!track) return;
        track.enabled = !track.enabled;
        setSystemAudioEnabled(track.enabled);
    }, []);

    const stopScreenShareRef = useRef(null);
    stopScreenShareRef.current = stopScreenShare;

    const startScreenShare = useCallback(async () => {
        if (!joinedRef.current) return;
        let stream;
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        } catch (e) {
            if (e.name !== 'NotAllowedError') console.error('[Voice] getDisplayMedia:', e);
            return;
        }
        screenStreamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0] ?? null;

        screenAudioTrackRef.current = audioTrack;
        setLocalScreenStream(stream);
        setHasSystemAudio(!!audioTrack);
        setSystemAudioEnabled(!!audioTrack);

        const channelId = activeChannelRef.current?.id;

        await Promise.all(
            Object.entries(peersRef.current).map(async ([uid, pc]) => {
                try {
                    if (screenSendersRef.current[uid]) {
                        await screenSendersRef.current[uid].replaceTrack(videoTrack);
                        if (sysAudioSendersRef.current[uid]) {
                            await sysAudioSendersRef.current[uid].replaceTrack(audioTrack ?? null);
                        }
                        if (channelId || dmConvIdRef.current) sendSignal(channelId, uid, { type: 'screen-share-start' });
                    } else {
                        screenSendersRef.current[uid] = pc.addTrack(videoTrack, stream);
                        if (audioTrack) {
                            sysAudioSendersRef.current[uid] = pc.addTrack(audioTrack, stream);
                        }
                        await renegotiate(uid);
                    }
                } catch (e) {
                    console.warn('[Voice] Screen share setup failed for', uid, e);
                }
            })
        );

        videoTrack.addEventListener('ended', () => stopScreenShareRef.current?.());
        setSharingScreen(true);
    }, []);

    // ── Audio controls ────────────────────────────────────────────────────────

    const toggleMute = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = muted;
            mutedRef.current = !muted;
            setMuted(m => !m);
        }
    }, [muted]);

    const toggleDeafen = useCallback(() => {
        const next = !deafened;
        deafenedRef.current = next;
        Object.entries(remoteGainsRef.current).forEach(([uid, gainNode]) => {
            gainNode.gain.value = next ? 0 : Math.min((userVolumesRef.current[uid] ?? 100) / 100, 1);
        });
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
        const gainNode = remoteGainsRef.current[userId];
        if (gainNode) {
            if (!deafenedRef.current) gainNode.gain.value = Math.min(v / 100, 1);
        } else {
            const audio = audioElemsRef.current[userId];
            if (audio) audio.volume = Math.min(v / 100, 1);
        }
    }, []);

    // ── External presence sync (server voice channels) ────────────────────────

    const syncExternalPresence = useCallback((e) => {
        if (!joinedRef.current || !activeChannel) return;
        if (parseInt(e.channel_id) !== parseInt(activeChannel.id)) return;
        if (e.action === 'leave') {
            setParticipants(prev => { const n = { ...prev }; delete n[e.user.id]; return n; });
            closePeer(e.user.id);
        } else if (e.action === 'join') {
            setParticipants(prev => ({ ...prev, [e.user.id]: e.user }));
        }
    }, [activeChannel]);

    // ── Incoming DM call listener ─────────────────────────────────────────────

    useEffect(() => {
        if (!auth?.user?.id) return;
        const echoPrivate = window.Echo.private(`App.Models.User.${auth.user.id}`);
        echoPrivate.listen('.DmCallInvite', ({ action, from_user, conversation_id }) => {
            if (action === 'invite') {
                if (!joinedRef.current) {
                    setIncomingCall({ conversationId: conversation_id, fromUser: from_user });
                }
            } else if (action === 'cancel') {
                setIncomingCall(prev => prev?.conversationId === conversation_id ? null : prev);
            } else if (action === 'decline') {
                setIncomingCall(prev => prev?.conversationId === conversation_id ? null : prev);
                if (dmConvIdRef.current === conversation_id) {
                    setDmCallStatus('declined');
                }
            }
        });
        return () => {
            echoPrivate.stopListening('.DmCallInvite');
        };
    }, [auth?.user?.id]);

    // ── beforeunload — keepalive fetch ────────────────────────────────────────

    useEffect(() => {
        const handleUnload = () => {
            if (!joinedRef.current) return;
            const isDm   = !!dmConvIdRef.current;
            const convId = dmConvIdRef.current;
            const chanId = activeChannelRef.current?.id;
            const routeUrl = isDm
                ? route('voice.conversation.presence', convId)
                : route('voice.presence', chanId);
            if (!routeUrl) return;
            fetch(routeUrl, {
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
    }, []);

    // ── Context value ─────────────────────────────────────────────────────────

    const value = {
        activeChannel,
        activeConversation,
        joined,
        muted,
        deafened,
        micVolume,
        participants,
        userVolumes,
        speakingUsers,
        sharingScreen,
        localScreenStream,
        remoteScreens,
        systemAudioEnabled,
        hasSystemAudio,
        incomingCall,
        dmCallStatus,
        join,
        joinDm,
        callDm,
        declineDmCall,
        leave,
        toggleMute,
        toggleDeafen,
        changeMicVolume,
        changeUserVolume,
        startScreenShare,
        stopScreenShare,
        toggleSystemAudio,
        syncExternalPresence,
    };

    return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
    const ctx = useContext(VoiceContext);
    if (!ctx) throw new Error('useVoice must be used inside VoiceProvider');
    return ctx;
}
