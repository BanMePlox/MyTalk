import { useState } from 'react';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const DISMISSED_KEY = 'mytalk_download_banner_dismissed';

function DownloadBanner() {
    const [visible, setVisible] = useState(
        () => !isTauri && !localStorage.getItem(DISMISSED_KEY)
    );

    if (!visible) return null;

    function dismiss() {
        localStorage.setItem(DISMISSED_KEY, '1');
        setVisible(false);
    }

    return (
        <div className="flex items-center justify-between gap-4 bg-indigo-600 px-4 py-2 text-sm text-white shrink-0">
            <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>¡MyTalk tiene app de escritorio para Windows! Disfruta de una mejor experiencia.</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <a
                    href="/downloads/MyTalk-setup.exe"
                    download
                    className="bg-white text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-md font-medium transition"
                >
                    Descargar
                </a>
                <button onClick={dismiss} className="text-white/70 hover:text-white transition" aria-label="Cerrar">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default function AuthenticatedLayout({ children }) {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-800 flex flex-col">
            <DownloadBanner />
            <main className="flex-1">{children}</main>
        </div>
    );
}
