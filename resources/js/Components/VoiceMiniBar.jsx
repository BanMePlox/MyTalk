import { useVoice } from '@/Contexts/VoiceContext';

export default function VoiceMiniBar() {
    const { joined, activeChannel, muted, deafened, toggleMute, toggleDeafen, leave } = useVoice();

    if (!joined || !activeChannel) return null;

    return (
        <div className="px-2 py-2 border-t border-gray-700 bg-gray-900">
            {/* Channel name + status */}
            <div className="flex items-center gap-1.5 px-1 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <span className="text-xs text-green-400 font-medium truncate flex-1">{activeChannel.name}</span>
                <span className="text-xs text-gray-500">En llamada</span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
                <button
                    onClick={toggleMute}
                    title={muted ? 'Activar micrófono' : 'Silenciar micrófono'}
                    className={`flex-1 flex items-center justify-center p-1.5 rounded-lg transition-colors ${
                        muted
                            ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
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
                </button>

                <button
                    onClick={toggleDeafen}
                    title={deafened ? 'Dejar de ensordecerse' : 'Ensordecerse'}
                    className={`flex-1 flex items-center justify-center p-1.5 rounded-lg transition-colors ${
                        deafened
                            ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {deafened
                            ? <><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" /></>
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 000 12M9 9a3 3 0 000 6" />
                        }
                    </svg>
                </button>

                <button
                    onClick={leave}
                    title="Salir de la llamada"
                    className="flex-1 flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:bg-red-600/20 hover:text-red-400 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
