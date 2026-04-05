import { usePage } from '@inertiajs/react';

/**
 * Returns a t() function that looks up translation keys from
 * the shared `translations` Inertia prop.
 *
 * Usage:
 *   const t = useTrans();
 *   t('nav.friends')                         // "Friends"
 *   t('voice.calling', { name: 'Pedro' })    // "Calling Pedro…"
 */
export function useTrans() {
    let translations = {};
    try {
        translations = usePage().props.translations ?? {};
    } catch {
        // Outside Inertia context (e.g. TitleBar rendered before <App>)
    }

    return function t(key, replacements = {}) {
        let str = translations[key] ?? key;
        Object.entries(replacements).forEach(([k, v]) => {
            str = str.replace(new RegExp(`:${k}`, 'g'), String(v));
        });
        return str;
    };
}
