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
 *   speakingUsers         – { [userId]: boolean }
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

const SPEAKING_THRESHOLD = 10; // 0-255 average frequency amplitude

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
    const [activeChannel, setActiveChannel] = useState(null);
    const [joined,        setJoined]        = useState(false);
    const [muted,         setMuted]         = useState(false);
    const [deafened,      setDeafened]      = useState(false);
    const [micVolume,     setMicVolume]     = useState(100);
    const [participants,  setParticipants]  = useState({});
    const [userVolumes,   setUserVolumes]   = useState({});
    const [speakingUsers, setSpeakingUsers] = useState({});
    const [sharingScreen,      setSharingScreen]      = useState(false);
    const [localScreenStream,  setLocalScreenStream]  = useState(null); // own screen preview
    const [remoteScreens,      setRemoteScreens]      = useState({}); // { [userId]: MediaStream }
    const [systemAudioEnabled, setSystemAudioEnabled] = useState(false);
    const [hasSystemAudio,     setHasSystemAudio]     = useState(false); // track available to toggle

    // Stable refs — survive re-renders and navigation
    const localStreamRef = useRef(null);
    const gainNodeRef    = useRef(null);
    const peersRef       = useRef({});
    const audioElemsRef  = useRef({});
    const echoChannelRef = useRef(null);
    const joinedRef      = useRef(false);
    const authUserRef    = useRef(null);
    const csrfTokenRef   = useRef(document.querySelector('meta[name="csrf-token"]')?.content ?? '');

    // Speaking detection refs
    const audioCtxRef        = useRef(null);   // shared AudioContext for remote streams
    const localAnalyserRef   = useRef(null);
    const remoteAnalysersRef = useRef({});     // { [userId]: AnalyserNode }
    const remoteGainsRef     = useRef({});     // { [userId]: GainNode } — volume + deafen control
    const animFrameRef       = useRef(null);

    // Screen sharing
    const screenStreamRef      = useRef(null);
    const screenSendersRef     = useRef({}); // { [userId]: RTCRtpSender } — video track
    const screenAudioTrackRef  = useRef(null);
    const sysAudioSendersRef   = useRef({}); // { [userId]: RTCRtpSender } — system audio track

    // Mirrors of state needed inside rAF loop / callbacks without stale closures
    const mutedRef         = useRef(false);
    const deafenedRef      = useRef(false);
    const userVolumesRef   = useRef({});
    const activeChannelRef = useRef(null);
    userVolumesRef.current   = userVolumes;   // always fresh
    activeChannelRef.current = activeChannel; // always fresh

    // ── Speaking detection loop ───────────────────────────────────────────────

    function startSpeakingLoop() {
        const data = new Uint8Array(32);
        const prev = {};

        const tick = () => {
            const next = {};

            // Local user
            if (localAnalyserRef.current && authUserRef.current) {
                localAnalyserRef.current.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                next[String(authUserRef.current.id)] = !mutedRef.current && avg > SPEAKING_THRESHOLD;
            }

            // Remote users
            Object.entries(remoteAnalysersRef.current).forEach(([uid, analyser]) => {
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                next[String(uid)] = avg > SPEAKING_THRESHOLD;
            });

            // Only setState when something actually changed (avoids 60fps re-renders)
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

    function sendSignal(channelId, toUserId, data) {
        window.axios.post(route('voice.signal', channelId), {
            to_user_id: toUserId,
            ...data,
        }).catch(console.error);
    }

    // ── Renegotiation ────────────────────────────────────────────────────────

    async function renegotiate(userId) {
        const pc        = peersRef.current[userId];
        const channelId = activeChannelRef.current?.id;
        if (!pc || !channelId) return;
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

            // ── Screen share (video track) ──
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

            // ── Audio track ──
            // First audio track = mic (main). Second = system audio from screen share.
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
                    // Mic audio: add speaking detection analyser
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
        // Include screen tracks if already sharing (before creating the offer SDP)
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

    // ── Public API ────────────────────────────────────────────────────────────

    const join = useCallback(async (channel, authUser) => {
        if (joinedRef.current) return; // already in a call

        let localStream;
        try {
            const rawStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            // Create a single shared AudioContext during user gesture so it starts in "running"
            // state. Peers created later reuse this same context — no suspended-context problem.
            audioCtxRef.current = new AudioContext();
            const audioCtx = audioCtxRef.current;
            const source    = audioCtx.createMediaStreamSource(rawStream);
            const gainNode  = audioCtx.createGain();
            gainNode.gain.value = micVolume / 100;
            const dest = audioCtx.createMediaStreamDestination();

            // Local analyser — tap from source (pre-gain) for raw mic level
            const localAnalyser   = audioCtx.createAnalyser();
            localAnalyser.fftSize = 64;
            source.connect(localAnalyser);

            source.connect(gainNode);
            gainNode.connect(dest);

            gainNodeRef.current      = gainNode;
            localAnalyserRef.current = localAnalyser;
            localStream              = dest.stream;
            localStream._rawStream   = rawStream;
            localStreamRef.current   = localStream;
        } catch (e) {
            alert('No se pudo acceder al micrófono: ' + e.message);
            return;
        }

        authUserRef.current = authUser;
        joinedRef.current   = true;
        mutedRef.current    = false;
        deafenedRef.current = false;
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
                if (type === 'offer') {
                    await handleOffer(channel.id, from_user_id, sdp);
                    // If we're already sharing, add our screen track to the new peer and renegotiate
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
                            } catch (e) { /* ignore */ }
                        }
                    }
                }
                if (type === 'answer') await handleAnswer(from_user_id, sdp);
                if (type === 'ice')    await handleIce(from_user_id, candidate);
                if (type === 'screen-share-stop') {
                    setRemoteScreens(prev => {
                        const next = { ...prev };
                        delete next[from_user_id];
                        return next;
                    });
                }
                if (type === 'screen-share-start') {
                    // replaceTrack was used — ontrack won't fire. Recover track from existing receiver.
                    const pc = peersRef.current[from_user_id];
                    if (pc) {
                        const receiver = pc.getReceivers().find(r => r.track.kind === 'video');
                        if (receiver) {
                            setRemoteScreens(prev => ({
                                ...prev,
                                [from_user_id]: new MediaStream([receiver.track]),
                            }));
                        }
                    }
                }
            });
    }, [micVolume]);

    const leave = useCallback(() => {
        const channel  = activeChannel;
        const authUser = authUserRef.current;
        if (!joinedRef.current || !channel) return;

        // Stop screen share silently (peers are about to close anyway)
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current     = null;
            screenAudioTrackRef.current = null;
            screenSendersRef.current    = {}; // cleared on full leave — new call = fresh peers
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

    const stopScreenShare = useCallback(() => {
        if (!screenStreamRef.current) return;
        // Null refs BEFORE stopping tracks — prevents re-entry from the 'ended' event listener.
        const stream = screenStreamRef.current;
        screenStreamRef.current     = null;
        screenAudioTrackRef.current = null;
        stream.getTracks().forEach(t => t.stop());

        // Use replaceTrack(null) instead of removeTrack — keeps the m-section in the SDP so the
        // sender can be reused on the next share without renegotiation.
        const channelId = activeChannelRef.current?.id;
        Object.entries(screenSendersRef.current).forEach(([uid, sender]) => {
            sender.replaceTrack(null).catch(() => {});
            if (channelId) sendSignal(channelId, uid, { type: 'screen-share-stop' });
        });
        Object.values(sysAudioSendersRef.current).forEach(sender => {
            sender.replaceTrack(null).catch(() => {});
        });
        // Keep senders in refs — reused by replaceTrack on next share.
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

    // Stable ref so startScreenShare can call stopScreenShare without dep issues
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
                        // Reuse existing sender — replaceTrack, no renegotiation needed
                        await screenSendersRef.current[uid].replaceTrack(videoTrack);
                        if (sysAudioSendersRef.current[uid]) {
                            await sysAudioSendersRef.current[uid].replaceTrack(audioTrack ?? null);
                        }
                        // Signal remote to re-show the screen (ontrack won't fire again)
                        if (channelId) sendSignal(channelId, uid, { type: 'screen-share-start' });
                    } else {
                        // First share for this peer — addTrack + renegotiate to add m-section
                        screenSendersRef.current[uid] = pc.addTrack(videoTrack, stream);
                        if (audioTrack) {
                            sysAudioSendersRef.current[uid] = pc.addTrack(audioTrack, stream);
                        }
                        await renegotiate(uid);
                        // ontrack fires on remote — no extra signal needed for first share
                    }
                } catch (e) {
                    console.warn('[Voice] Screen share setup failed for', uid, e);
                }
            })
        );

        // Handle the browser's native "Stop sharing" button
        videoTrack.addEventListener('ended', () => stopScreenShareRef.current?.());
        setSharingScreen(true);
    }, []);

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
        // Audio elements are always muted; gainNode controls volume and deafen
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
        // Use GainNode if available (AudioContext routed), otherwise fall back to audio element
        const gainNode = remoteGainsRef.current[userId];
        if (gainNode) {
            if (!deafenedRef.current) gainNode.gain.value = Math.min(v / 100, 1);
        } else {
            const audio = audioElemsRef.current[userId];
            if (audio) audio.volume = Math.min(v / 100, 1);
        }
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
        speakingUsers,
        sharingScreen,
        localScreenStream,
        remoteScreens,
        systemAudioEnabled,
        hasSystemAudio,
        join,
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
