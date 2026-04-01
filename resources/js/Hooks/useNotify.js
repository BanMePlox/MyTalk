const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function initTauriNotifications() {
    if (!isTauri) return;
    try {
        const granted = await window.__TAURI_INTERNALS__.invoke('plugin:notification|is_permission_granted');
        if (!granted) {
            await window.__TAURI_INTERNALS__.invoke('plugin:notification|request_permission');
        }
    } catch {}
}

initTauriNotifications();

export function notify(title, body) {
    if (isTauri) {
        // Intentar siempre — si no hay permiso fallará silenciosamente
        window.__TAURI_INTERNALS__.invoke('plugin:notification|notify', { title, body }).catch(() => {});
    } else if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/images/MyTalk.png' });
    }
}
