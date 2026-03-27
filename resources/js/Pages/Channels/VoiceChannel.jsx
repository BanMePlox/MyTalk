import { useEffect, useRef, useState, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import { useVoice } from '@/Contexts/VoiceContext';

export default function VoiceChannel({ channel }) {
    const { auth } = usePage().props;
    const {
        activeChannel,
        joined,
        muted,
        deafened,
        micVolume,
        participants,
        userVolumes,
        speakingUsers,
        join,
        leave,
        toggleMute,
        toggleDeafen,
        changeMicVolume,
        changeUserVolume,
    } = useVoice();

    const inThisChannel  = joined && activeChannel?.id === channel.id;
    const inOtherChannel = joined && activeChannel?.id !== channel.id;

    // ── Mic test ───────────────────────────────────────────────────────────────
    const [testActive, setTestActive] = useState(false);
    const [micLevel, setMicLevel]     = useState(0);
    const testStreamRef  = useRef(null);
    const testAudioRef   = useRef(null);
    const analyserRef    = useRef(null);
    const animFrameRef   = useRef(null);

    const startMicTest = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            testStreamRef.current = stream;

            const audio = new Audio();
            audio.srcObject = stream;
            audio.volume = 1;
            audio.play().catch(() => {});
            testAudioRef.current = audio;

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

    useEffect(() => () => stopMicTest(), []);

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
                        {!inThisChannel
                            ? 'Únete para participar en la llamada'
                            : participantList.length === 1
                                ? 'Solo tú en el canal'
                                : `${participantList.length} participantes`}
                    </p>
                </div>

                {/* Participants */}
                {inThisChannel && participantList.length > 0 && (
                    <div className="bg-gray-800 rounded-xl p-3 mb-6 space-y-2 border border-gray-700">
                        {participantList.map(user => (
                            <div key={user.id} className="px-1 py-1">
                                <div className="flex items-center gap-3">
                                    <div className={`relative shrink-0 rounded-full transition-shadow duration-150 ${speakingUsers[user.id] ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-gray-800' : ''}`}>
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

                                {/* Per-user volume slider */}
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

                {/* Mic test — only shown when not in any call */}
                {!inThisChannel && !inOtherChannel && (
                    <div className="bg-gray-800 rounded-xl p-4 mb-5 border border-gray-700">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Probar micrófono y altavoces</p>

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
                    {inThisChannel ? (
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
                    ) : inOtherChannel ? (
                        <div className="text-center">
                            <p className="text-sm text-gray-400 mb-3">
                                Ya estás en <span className="text-indigo-300 font-medium">{activeChannel.name}</span>
                            </p>
                            <button
                                onClick={leave}
                                className="text-sm text-red-400 hover:text-red-300 transition-colors underline"
                            >
                                Salir de esa llamada
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <button
                                onClick={() => join(channel, auth.user)}
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
