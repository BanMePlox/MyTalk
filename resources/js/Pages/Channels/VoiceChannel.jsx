import { useEffect, useRef, useState, useCallback } from 'react';
import { usePage } from '@inertiajs/react';

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export default function VoiceChannel({ channel, externalPresenceEvent }) {
    const { auth } = usePage().props;
    const [participants, setParticipants] = useState({});
    const [joined, setJoined]             = useState(false);
    const [muted, setMuted]               = useState(false);
    const [deafened, setDeafened]         = useState(false);
    const [micVolume, setMicVolume]       = useState(100);  // 0-200
    const [userVolumes, setUserVolumes]   = useState({});   // { userId: 0-200 }

    const localStreamRef  = useRef(null);
    const gainNodeRef     = useRef(null);  // GainNode for mic volume
    const peersRef        = useRef({});      // { userId: RTCPeerConnection }
    const audioElemsRef   = useRef({});      // { userId: HTMLAudioElement }
    const echoChannelRef  = useRef(null);
    const joinedRef       = useRef(false);   // stable ref for cleanup
    const csrfTokenRef    = useRef(document.querySelector('meta[name="csrf-token"]')?.content ?? '');

    // ── Mic test ───────────────────────────────────────────────────────────────
    const [testActive, setTestActive]   = useState(false);
    const [micLevel, setMicLevel]       = useState(0);   // 0-100
    const testStreamRef   = useRef(null);
    const testAudioRef    = useRef(null);  // HTMLAudioElement for playback
    const analyserRef     = useRef(null);
    const animFrameRef    = useRef(null);

    const startMicTest = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            testStreamRef.current = stream;

            // Playback through speakers (echo test)
            const audio = new Audio();
            audio.srcObject = stream;
            audio.volume = 1;
            audio.play().catch(() => {});
            testAudioRef.current = audio;

            // Level meter via AnalyserNode
            const ctx      = new AudioContext();
            const source   = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const data = new Uint8Array(analyser.frequencyBinCount);
            const tick = () => {
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                setMicLevel(Math.min(100, Math.round(avg * 2)));
                animFrameRef.current = requestAnimationFrame(tick);
            };
            animFrameRef.current = requestAnimationFrame(tick);
            setTestActive(true);
        } catch (e) {
            alert('No se pudo acceder al micrófono: ' + e.message);
        }
    }, []);

    const stopMicTest = useCallback(() => {
        cancelAnimationFrame(animFrameRef.current);
        testStreamRef.current?.getTracks().forEach(t => t.stop());
        if (testAudioRef.current) {
            testAudioRef.current.srcObject = null;
            testAudioRef.current = null;
        }
        testStreamRef.current = null;
        analyserRef.current   = null;
        setTestActive(false);
        setMicLevel(0);
    }, []);

    // Stop test on unmount
    useEffect(() => () => stopMicTest(), []);

    // ── Helpers ────────────────────────────────────────────────────────────────

    function sendSignal(toUserId, data) {
        window.axios.post(route('voice.signal', channel.id), {
            to_user_id: toUserId,
            ...data,
        }).catch(console.error);
    }

    function createPeer(userId) {
        if (peersRef.current[userId]) return peersRef.current[userId];

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pc._icePending = []; // queue candidates until remote desc is set

        localStreamRef.current?.getTracks().forEach(track =>
            pc.addTrack(track, localStreamRef.current)
        );

        pc.onicecandidate = ({ candidate }) => {
            if (candidate) sendSignal(userId, { type: 'ice', candidate: candidate.toJSON() });
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

    async function createOffer(userId) {
        const pc = createPeer(userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(userId, { type: 'offer', sdp: encodeSdp(offer.sdp) });
    }

    const encodeSdp = (sdp) => btoa(unescape(encodeURIComponent(sdp)));
    const decodeSdp = (b64) => decodeURIComponent(escape(atob(b64)));

    async function handleOffer(fromUserId, sdp) {
        const pc = createPeer(fromUserId);
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: decodeSdp(sdp) }));
        // Flush queued ICE candidates
        for (const c of pc._icePending) {
            try { await pc.addIceCandidate(c); } catch {}
        }
        pc._icePending = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(fromUserId, { type: 'answer', sdp: encodeSdp(answer.sdp) });
    }

    async function handleAnswer(fromUserId, sdp) {
        const pc = peersRef.current[fromUserId];
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: decodeSdp(sdp) }));
        // Flush queued ICE candidates
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

    // ── Join / Leave ───────────────────────────────────────────────────────────

    async function join() {
        try {
            const rawStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            // Route mic through a GainNode so we can control volume
            const audioCtx  = new AudioContext();
            const source    = audioCtx.createMediaStreamSource(rawStream);
            const gainNode  = audioCtx.createGain();
            gainNode.gain.value = micVolume / 100;
            const dest      = audioCtx.createMediaStreamDestination();
            source.connect(gainNode);
            gainNode.connect(dest);

            gainNodeRef.current    = gainNode;
            localStreamRef.current = dest.stream;
            // Keep raw stream to stop tracks on leave
            localStreamRef.current._rawStream = rawStream;
        } catch (e) {
            alert('No se pudo acceder al micrófono: ' + e.message);
            return;
        }

        joinedRef.current = true;
        setJoined(true);

        window.axios.post(route('voice.presence', channel.id), { action: 'join' }).catch(console.error);

        echoChannelRef.current = window.Echo.join(`presence-voice.${channel.id}`)
            .here(users => {
                const map = {};
                users.forEach(u => { map[u.id] = u; });
                setParticipants(map);
                // Send offer to every user already in the channel
                users.forEach(u => {
                    if (u.id !== auth.user.id) createOffer(u.id);
                });
            })
            .joining(user => {
                setParticipants(prev => ({ ...prev, [user.id]: user }));
                // The joining user will send us an offer; we just wait
            })
            .leaving(user => {
                setParticipants(prev => {
                    const next = { ...prev };
                    delete next[user.id];
                    return next;
                });
                closePeer(user.id);
            });

        // VoiceSignal is broadcast on the user's private channel, not the presence channel
        window.Echo.private(`App.Models.User.${auth.user.id}`)
            .listen('.VoiceSignal', async ({ type, sdp, candidate, from_user_id, channel_id }) => {
                if (parseInt(channel_id) !== parseInt(channel.id)) return; // ignore signals for other voice channels
                if (type === 'offer')  await handleOffer(from_user_id, sdp);
                if (type === 'answer') await handleAnswer(from_user_id, sdp);
                if (type === 'ice')    await handleIce(from_user_id, candidate);
            });
    }

    function leave() {
        Object.keys(peersRef.current).forEach(closePeer);
        localStreamRef.current?._rawStream?.getTracks().forEach(t => t.stop());
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        gainNodeRef.current = null;
        window.Echo.leave(`presence-voice.${channel.id}`);
        window.Echo.private(`App.Models.User.${auth.user.id}`).stopListening('.VoiceSignal');
        echoChannelRef.current = null;
        joinedRef.current = false;
        setJoined(false);
        setMuted(false);
        setDeafened(false);
        setParticipants({});
        // keepalive ensures the request completes even if the page navigates away
        fetch(route('voice.presence', channel.id), {
            method: 'POST',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrfTokenRef.current,
            },
            body: JSON.stringify({ action: 'leave' }),
        }).catch(() => {});
    }

    function toggleMute() {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = muted;
            setMuted(m => !m);
        }
    }

    function toggleDeafen() {
        const next = !deafened;
        // Mute/unmute all remote audio elements
        Object.values(audioElemsRef.current).forEach(el => { el.muted = next; });
        setDeafened(next);
    }

    function changeMicVolume(val) {
        const v = Number(val);
        setMicVolume(v);
        if (gainNodeRef.current) gainNodeRef.current.gain.value = v / 100;
    }

    function changeUserVolume(userId, val) {
        const v = Number(val);
        setUserVolumes(prev => ({ ...prev, [userId]: v }));
        const audio = audioElemsRef.current[userId];
        if (audio) audio.volume = Math.min(v / 100, 1); // HTMLAudioElement.volume max is 1
    }

    // Cleanup on unmount or channel navigation
    useEffect(() => {
        return () => { if (joinedRef.current) leave(); };
    }, [channel.id]);

    // Sync participants from external VoicePresenceChanged events (broadcast via presence-server)
    // This acts as a fallback in case Echo's presence .leaving() doesn't fire in time
    useEffect(() => {
        if (!externalPresenceEvent || !joined) return;
        if (parseInt(externalPresenceEvent.channel_id) !== parseInt(channel.id)) return;
        const { action, user } = externalPresenceEvent;
        if (action === 'leave') {
            setParticipants(prev => {
                const next = { ...prev };
                delete next[user.id];
                return next;
            });
            closePeer(user.id);
        } else if (action === 'join') {
            setParticipants(prev => ({ ...prev, [user.id]: user }));
        }
    }, [externalPresenceEvent]);

    // ── UI ─────────────────────────────────────────────────────────────────────

    const participantList = Object.values(participants);

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 p-8">
            <div className="w-full max-w-sm">
                {/* Icon + title */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                    <h2 className="text-white font-bold text-xl">{channel.name}</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {!joined
                            ? 'Únete para participar en la llamada'
                            : participantList.length === 1
                                ? 'Solo tú en el canal'
                                : `${participantList.length} participantes`}
                    </p>
                </div>

                {/* Participants */}
                {joined && participantList.length > 0 && (
                    <div className="bg-gray-800 rounded-xl p-3 mb-6 space-y-2 border border-gray-700">
                        {participantList.map(user => (
                            <div key={user.id} className="px-1 py-1">
                                <div className="flex items-center gap-3">
                                    <div className="relative shrink-0">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                                                {user.name[0].toUpperCase()}
                                            </div>
                                        )}
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800" />
                                    </div>
                                    <span className={`text-sm font-medium flex-1 truncate ${user.id === auth.user.id ? 'text-indigo-300' : 'text-gray-200'}`}>
                                        {user.name}{user.id === auth.user.id ? ' (tú)' : ''}
                                    </span>
                                    {user.id === auth.user.id && (muted || deafened) && (
                                        <div className="flex gap-1">
                                            {muted && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                                </svg>
                                            )}
                                            {deafened && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                                                </svg>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Per-user volume slider (only for remote users) */}
                                {user.id !== auth.user.id && (
                                    <div className="flex items-center gap-2 mt-1.5 pl-11">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 000 12M9 9a3 3 0 000 6" />
                                        </svg>
                                        <input
                                            type="range"
                                            min="0" max="100" step="1"
                                            value={userVolumes[user.id] ?? 100}
                                            onChange={e => changeUserVolume(user.id, e.target.value)}
                                            className="flex-1 accent-indigo-500 h-1 rounded-full cursor-pointer"
                                        />
                                        <span className="text-xs text-gray-600 font-mono w-7 text-right">
                                            {userVolumes[user.id] ?? 100}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Mic test */}
                {!joined && (
                    <div className="bg-gray-800 rounded-xl p-4 mb-5 border border-gray-700">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Probar micrófono y altavoces</p>

                        {/* Level bar */}
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-3 overflow-hidden">
                            <div
                                className="h-2 rounded-full transition-all duration-75"
                                style={{
                                    width: `${micLevel}%`,
                                    backgroundColor: micLevel > 70 ? '#ef4444' : micLevel > 40 ? '#f59e0b' : '#10b981',
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-gray-500">
                                {testActive
                                    ? 'Habla — deberías escucharte por los altavoces'
                                    : 'Pulsa para escucharte a ti mismo'}
                            </p>
                            <button
                                onClick={testActive ? stopMicTest : startMicTest}
                                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                    testActive
                                        ? 'bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30'
                                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                                }`}
                            >
                                {testActive ? '⏹ Parar test' : '🎙 Iniciar test'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="flex flex-col gap-3 w-full">
                    {joined ? (
                        <>
                            {/* Mic volume slider */}
                            <div className="bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-400 font-medium">Volumen del micrófono</span>
                                    <span className="text-xs text-gray-500 font-mono">{micVolume}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="200" step="1"
                                    value={micVolume}
                                    onChange={e => changeMicVolume(e.target.value)}
                                    className="w-full accent-indigo-500 h-1.5 rounded-full cursor-pointer"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={toggleMute}
                                    title={muted ? 'Activar micrófono' : 'Silenciar micrófono'}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                        muted
                                            ? 'bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30'
                                            : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                                    }`}
                                >
                                    {muted ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                        </svg>
                                    )}
                                    {muted ? 'Silenciado' : 'Micro'}
                                </button>

                                <button
                                    onClick={toggleDeafen}
                                    title={deafened ? 'Dejar de ensordecerse' : 'Ensordecerse'}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                        deafened
                                            ? 'bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30'
                                            : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        {deafened
                                            ? <><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" /></>
                                            : <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 000 12M9 9a3 3 0 000 6" />
                                        }
                                    </svg>
                                    {deafened ? 'Ensordecido' : 'Audio'}
                                </button>

                                <button
                                    onClick={leave}
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                                    </svg>
                                    Salir
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-center">
                            <button
                                onClick={join}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                                Unirse al canal de voz
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
