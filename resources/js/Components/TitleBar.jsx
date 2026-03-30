export default function TitleBar() {
    async function minimize() {
        try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            await getCurrentWindow().minimize();
        } catch {}
    }

    async function toggleMaximize() {
        try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            await getCurrentWindow().toggleMaximize();
        } catch {}
    }

    async function hide() {
        try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            await getCurrentWindow().hide();
        } catch {}
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between h-8 bg-gray-950 select-none" data-tauri-drag-region>
            {/* Logo + título */}
            <div className="flex items-center gap-2 px-3 pointer-events-none" data-tauri-drag-region>
                <div className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center text-[9px] font-bold text-white leading-none">M</div>
                <span className="text-white/50 text-xs">MyTalk</span>
            </div>

            {/* Controles de ventana */}
            <div className="flex items-center h-full">
                <button
                    onClick={minimize}
                    className="w-10 h-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition"
                    title="Minimizar"
                >
                    <svg className="w-3 h-3" viewBox="0 0 10 1" fill="currentColor">
                        <rect width="10" height="1" />
                    </svg>
                </button>

                <button
                    onClick={toggleMaximize}
                    className="w-10 h-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition"
                    title="Maximizar"
                >
                    <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                        <rect x="0" y="0" width="10" height="10" />
                    </svg>
                </button>

                <button
                    onClick={hide}
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
