import { useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { check as checkUpdate } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export default function TitleBar() {
    const winRef = useRef(null);
    function win() {
        if (!winRef.current) winRef.current = getCurrentWindow();
        return winRef.current;
    }
    const [maximized, setMaximized] = useState(false);
    const [updateReady, setUpdateReady] = useState(null); // update object when available

    useEffect(() => {
        win().isMaximized().then(setMaximized);
        const unlisten = win().onResized(() => win().isMaximized().then(setMaximized));
        return () => { unlisten.then(f => f()); };
    }, []);

    useEffect(() => {
        checkUpdate().then(update => {
            if (update?.available) setUpdateReady(update);
        }).catch(() => {});
    }, []);

    async function installUpdate() {
        if (!updateReady) return;
        await updateReady.downloadAndInstall();
        await relaunch();
    }

    return (
        <div className="flex items-center justify-between h-8 bg-gray-950 shrink-0 select-none" data-tauri-drag-region>
            {/* Logo + título */}
            <div className="flex items-center gap-2 px-3 pointer-events-none" data-tauri-drag-region>
                <div className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center text-[9px] font-bold text-white leading-none">M</div>
                <span className="text-white/50 text-xs">MyTalk</span>
            </div>

            {/* Notificación de actualización */}
            {updateReady && (
                <button
                    onClick={installUpdate}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-0.5 rounded transition"
                >
                    Nueva versión disponible — Instalar y reiniciar
                </button>
            )}

            {/* Controles de ventana */}
            <div className="flex items-center h-full">
                {/* Minimizar */}
                <button
                    onClick={() => win().minimize()}
                    className="w-10 h-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition"
                    title="Minimizar"
                >
                    <svg className="w-3 h-3" viewBox="0 0 10 1" fill="currentColor">
                        <rect width="10" height="1" />
                    </svg>
                </button>

                {/* Maximizar / restaurar */}
                <button
                    onClick={() => win().toggleMaximize()}
                    className="w-10 h-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition"
                    title={maximized ? 'Restaurar' : 'Maximizar'}
                >
                    {maximized ? (
                        <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                            <rect x="2" y="0" width="8" height="8" />
                            <path d="M0 2v8h8" />
                        </svg>
                    ) : (
                        <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                            <rect x="0" y="0" width="10" height="10" />
                        </svg>
                    )}
                </button>

                {/* Cerrar (ocultar a bandeja) */}
                <button
                    onClick={() => win().hide()}
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
