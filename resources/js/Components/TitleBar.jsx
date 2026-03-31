import { useEffect, useRef, useState } from 'react';

async function invoke(cmd, args = {}) {
    try {
        return await window.__TAURI_INTERNALS__.invoke(cmd, args);
    } catch {}
}

function windowLabel() {
    return window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label ?? 'main';
}

export default function TitleBar() {
    const label = windowLabel();
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [debugInfo, setDebugInfo] = useState('checking…');
    const updateRid = useRef(null);

    useEffect(() => {
        invoke('plugin:updater|check')
            .then(update => {
                setDebugInfo(update ? `rid:${update.rid} v${update.currentVersion}→${update.version}` : 'null (no update)');
                if (update?.version) {
                    updateRid.current = update.rid;
                    setUpdateAvailable(true);
                }
            })
            .catch(e => setDebugInfo(`error: ${e}`));
    }, []);

    async function installUpdate() {
        const internals = window.__TAURI_INTERNALS__;
        setDebugInfo('downloading…');
        await new Promise((resolve, reject) => {
            const onEvent = internals.transformCallback((event) => {
                setDebugInfo(`event: ${event.event}`);
                if (event.event === 'Finished') resolve();
                if (event.event === 'Error') reject(new Error(JSON.stringify(event.data)));
            });
            internals.invoke('plugin:updater|download_and_install', {
                rid: updateRid.current,
                onEvent,
            }).catch(reject);
        });
        await invoke('plugin:process|restart');
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between h-8 bg-gray-950 select-none" data-tauri-drag-region>
            {/* Logo + título */}
            <div className="flex items-center gap-2 px-3 pointer-events-none" data-tauri-drag-region>
                <img src="/images/MyTalk.png" alt="MyTalk" className="w-4 h-4 rounded object-contain" />
                <span className="text-white/50 text-xs">MyTalk</span>
                <span className="text-yellow-400/70 text-xs ml-2">[{debugInfo}]</span>
            </div>

            {updateAvailable && (
                <button
                    onClick={installUpdate}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-0.5 rounded transition"
                >
                    Nueva versión disponible — Instalar y reiniciar
                </button>
            )}

            {/* Controles de ventana */}
            <div className="flex items-center h-full">
                <button
                    onClick={() => invoke('plugin:window|minimize', { label })}
                    className="w-10 h-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition"
                    title="Minimizar"
                >
                    <svg className="w-3 h-3" viewBox="0 0 10 1" fill="currentColor">
                        <rect width="10" height="1" />
                    </svg>
                </button>

                <button
                    onClick={() => invoke('plugin:window|toggle_maximize', { label })}
                    className="w-10 h-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition"
                    title="Maximizar"
                >
                    <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                        <rect x="0" y="0" width="10" height="10" />
                    </svg>
                </button>

                <button
                    onClick={() => invoke('plugin:window|hide', { label })}
                    className="w-10 h-full flex items-center justify-center text-white/40 hover:text-white hover:bg-red-600 transition"
                    title="Minimizar a bandeja"
                >
                    <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <line x1="0" y1="0" x2="10" y2="10" />
                        <line x1="10" y1="0" x2="0" y2="10" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
