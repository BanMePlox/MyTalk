import { useEffect, useRef, useState, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import { useVoice } from '@/Contexts/VoiceContext';
import { useTrans } from '@/Hooks/useTrans';

function ScreenVideo({ stream, userName }) {
    const videoRef     = useRef(null);
    const containerRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
    }, [stream]);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div ref={containerRef} className="relative rounded-xl overflow-hidden bg-black border border-border group">
            <video ref={videoRef} autoPlay playsInline className="w-full block" />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <span className="text-xs text-text-on-accent bg-black/60 px-2 py-0.5 rounded-md">{userName}</span>
                <button
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 text-text-on-accent p-1.5 rounded-lg"
                >
                    {isFullscreen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}

export default function VoiceChannel({ channel }) {
    const { auth } = usePage().props;
    const t = useTrans();
    const {
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
        <div className="flex-1 flex flex-col items-center justify-center bg-bg p-8">
            <div className={`w-full ${Object.keys(remoteScreens).length > 0 ? 'max-w-2xl' : 'max-w-sm'}`}>
                {/* Icon + title */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-3 border border-border">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                    <h2 className="text-text font-bold text-xl">{channel.name}</h2>
                    <p className="text-text-muted text-sm mt-1">
                        {!inThisChannel
                            ? t('voice.join_cta')
                            : participantList.length === 1
                                ? t('voice.only_you')
                                : t('voice.participant_count', { count: participantList.length })}
                    </p>
                </div>

                {/* Local screen preview */}
                {inThisChannel && localScreenStream && (
                    <div className="mb-2">
                        <ScreenVideo stream={localScreenStream} userName={t('voice.local_preview')} />
                    </div>
                )}

                {/* Remote screen shares */}
                {inThisChannel && Object.keys(remoteScreens).length > 0 && (
                    <div className="space-y-2 mb-4">
                        {Object.entries(remoteScreens).map(([uid, stream]) => (
                            <ScreenVideo
                                key={uid}
                                stream={stream}
                                userName={participants[uid]?.name ?? 'Usuario'}
                            />
                        ))}
                    </div>
                )}

                {/* Local sharing indicator */}
                {inThisChannel && sharingScreen && (
                    <div className="flex items-center gap-2 bg-accent/20 border border-accent/30 rounded-xl px-3 py-2 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-accent flex-1">{t('voice.sharing_screen')}</span>
                        {hasSystemAudio && (
                            <button
                                onClick={toggleSystemAudio}
                                title={systemAudioEnabled ? t('voice.mute_system_audio') : t('voice.unmute_system_audio')}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                                    systemAudioEnabled
                                        ? 'bg-accent/30 text-accent hover:bg-accent/40'
                                        : 'bg-bg-muted text-text-secondary hover:bg-bg-muted'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    {systemAudioEnabled
                                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 000 12M9 9a3 3 0 000 6" />
                                        : <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                    }
                                </svg>
                                {t('voice.system')}
                            </button>
                        )}
                        <button onClick={stopScreenShare} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                            {t('voice.stop_share')}
                        </button>
                    </div>
                )}

                {/* Participants */}
                {inThisChannel && participantList.length > 0 && (
                    <div className="bg-bg-elevated rounded-xl p-3 mb-6 space-y-2 border border-border">
                        {participantList.map(user => (
                            <div key={user.id} className="px-1 py-1">
                                <div className="flex items-center gap-3">
                                    <div className={`relative shrink-0 rounded-full transition-shadow duration-150 ${speakingUsers[user.id] ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-bg-elevated' : ''}`}>
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-text-on-accent text-sm font-bold">
                                                {user.name[0].toUpperCase()}
                                            </div>
                                        )}
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-border" />
                                    </div>
                                    <span className={`text-sm font-medium flex-1 truncate ${user.id === auth.user.id ? 'text-accent' : 'text-text'}`}>
                                        {user.name}{user.id === auth.user.id ? ` ${t('voice.you')}` : ''}
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
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 000 12M9 9a3 3 0 000 6" />
                                        </svg>
                                        <input
                                            type="range"
                                            min="0" max="100" step="1"
                                            value={userVolumes[user.id] ?? 100}
                                            onChange={e => changeUserVolume(user.id, e.target.value)}
                                            className="flex-1 accent-accent h-1 rounded-full cursor-pointer"
                                        />
                                        <span className="text-xs text-text-muted font-mono w-7 text-right">
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
                    <div className="bg-bg-elevated rounded-xl p-4 mb-5 border border-border">
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">{t('voice.mic_test_title')}</p>

                        <div className="w-full bg-bg-muted rounded-full h-2 mb-3 overflow-hidden">
                            <div
                                className="h-2 rounded-full transition-all duration-75"
                                style={{
                                    width: `${micLevel}%`,
                                    backgroundColor: micLevel > 70 ? '#ef4444' : micLevel > 40 ? '#f59e0b' : '#10b981',
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-text-muted">
                                {testActive ? t('voice.mic_test_active') : t('voice.mic_test_inactive')}
                            </p>
                            <button
                                onClick={testActive ? stopMicTest : startMicTest}
                                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                    testActive
                                        ? 'bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30'
                                        : 'bg-bg-muted hover:bg-bg-muted text-text border border-border'
                                }`}
                            >
                                {testActive ? t('voice.stop_test') : t('voice.start_test')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="flex flex-col gap-3 w-full">
                    {inThisChannel ? (
                        <>
                            {/* Mic volume slider */}
                            <div className="bg-bg-elevated rounded-xl px-4 py-3 border border-border">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-text-secondary font-medium">{t('voice.mic_volume')}</span>
                                    <span className="text-xs text-text-muted font-mono">{micVolume}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="200" step="1"
                                    value={micVolume}
                                    onChange={e => changeMicVolume(e.target.value)}
                                    className="w-full accent-accent h-1.5 rounded-full cursor-pointer"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={toggleMute}
                                    title={muted ? t('voice.unmute_title') : t('voice.mute_title')}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                        muted
                                            ? 'bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30'
                                            : 'bg-bg-muted hover:bg-bg-muted text-text border border-border'
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
                                    {muted ? t('voice.muted_label') : t('voice.mic_label')}
                                </button>

                                <button
                                    onClick={toggleDeafen}
                                    title={deafened ? t('voice.undeafen_title') : t('voice.deafen_title')}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                        deafened
                                            ? 'bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30'
                                            : 'bg-bg-muted hover:bg-bg-muted text-text border border-border'
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        {deafened
                                            ? <><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" /></>
                                            : <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 000 12M9 9a3 3 0 000 6" />
                                        }
                                    </svg>
                                    {deafened ? t('voice.deafened_label') : t('voice.audio_label')}
                                </button>

                                <button
                                    onClick={sharingScreen ? stopScreenShare : startScreenShare}
                                    title={sharingScreen ? t('voice.stop_share_title') : t('voice.screen_share_title')}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                        sharingScreen
                                            ? 'bg-accent-soft border border-accent/40 text-accent hover:bg-accent-soft'
                                            : 'bg-bg-muted hover:bg-bg-muted text-text border border-border'
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {sharingScreen ? t('voice.sharing_label') : t('voice.screen_label')}
                                </button>

                                <button
                                    onClick={leave}
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-text-on-accent text-sm font-medium transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                                    </svg>
                                    {t('voice.leave')}
                                </button>
                            </div>
                        </>
                    ) : inOtherChannel ? (
                        <div className="text-center">
                            <p className="text-sm text-text-secondary mb-3">
                                {t('voice.in_other_channel', { name: activeChannel.name })}
                            </p>
                            <button
                                onClick={leave}
                                className="text-sm text-red-400 hover:text-red-300 transition-colors underline"
                            >
                                {t('voice.leave_other')}
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <button
                                onClick={() => join(channel, auth.user)}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent text-text-on-accent font-semibold transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                                {t('voice.join_btn')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
