import { useEffect, useRef, useState } from 'react';
import { useTrans } from '@/Hooks/useTrans';

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
    const t = useTrans();
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [currentVersion, setCurrentVersion] = useState(null);
    const updateRid = useRef(null);

    useEffect(() => {
        invoke('plugin:app|version').then(v => { if (v) setCurrentVersion(v); });
        invoke('plugin:updater|check').then(update => {
            if (update?.version) {
                updateRid.current = update.rid;
                setUpdateAvailable(true);
            }
        });
    }, []);

    function installUpdate() {
        const internals = window.__TAURI_INTERNALS__;
        setUpdateAvailable(false);
        const onEvent = internals.transformCallback(() => {});
        internals.invoke('plugin:updater|download_and_install', {
            rid: updateRid.current,
            headers: [],
            onEvent: `__CHANNEL__:${onEvent}`,
        }).catch(() => {});
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between h-8 bg-bg-muted border-b border-border select-none" data-tauri-drag-region>
            <div className="flex items-center gap-2 px-3 pointer-events-none" data-tauri-drag-region>
                <img src="/images/MyTalk.png" alt="MyTalk" className="w-4 h-4 rounded-sm object-contain" />
                <span className="text-text-muted text-xs">MyTalk {currentVersion && <span className="text-text-muted/70">v{currentVersion}</span>}</span>
            </div>

            {updateAvailable && (
                <button
                    onClick={installUpdate}
                    className="text-xs bg-accent hover:opacity-90 text-text-on-accent px-3 py-0.5 rounded-sm transition"
                >
                    {t('app.update_available')}
                </button>
            )}

            <div className="flex items-center h-full">
                <button
                    onClick={() => invoke('plugin:window|minimize', { label })}
                    className="w-10 h-full flex items-center justify-center text-text-muted hover:text-text hover:bg-bg-elevated transition"
                    title={t('app.minimize')}
                >
                    <svg className="w-3 h-3" viewBox="0 0 10 1" fill="currentColor">
                        <rect width="10" height="1" />
                    </svg>
                </button>

                <button
                    onClick={() => invoke('plugin:window|toggle_maximize', { label })}
                    className="w-10 h-full flex items-center justify-center text-text-muted hover:text-text hover:bg-bg-elevated transition"
                    title={t('app.maximize')}
                >
                    <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                        <rect x="0" y="0" width="10" height="10" />
                    </svg>
                </button>

                <button
                    onClick={() => invoke('plugin:window|hide', { label })}
                    className="w-10 h-full flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition"
                    title={t('app.minimize_tray')}
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
