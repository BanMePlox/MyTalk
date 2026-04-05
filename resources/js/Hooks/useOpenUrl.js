/**
 * Opens a URL in the system browser (Tauri) or a new tab (web).
 */
export function openUrl(url) {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        window.__TAURI_INTERNALS__.invoke('plugin:opener|open_url', { url });
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}
