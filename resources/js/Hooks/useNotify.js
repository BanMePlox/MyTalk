const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let tauriPermissionGranted = false;

async function initTauriNotifications() {
    if (!isTauri) return;
    try {
        const granted = await window.__TAURI_INTERNALS__.invoke('plugin:notification|is_permission_granted');
        if (granted === true || granted?.toLowerCase?.() === 'granted') {
            tauriPermissionGranted = true;
            return;
        }
        const result = await window.__TAURI_INTERNALS__.invoke('plugin:notification|request_permission');
        tauriPermissionGranted = result?.toLowerCase() === 'granted';
    } catch {}
}

// Llama a initTauriNotifications una sola vez al cargar
initTauriNotifications();

export function notify(title, body) {
    if (isTauri) {
        if (!tauriPermissionGranted) return;
        window.__TAURI_INTERNALS__.invoke('plugin:notification|notify', { title, body }).catch(() => {});
    } else {
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/images/MyTalk.png' });
        }
    }
}
